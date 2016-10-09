/*
 * Author: felipe@astroza.cl
 */
const serialport = require('serialport');
const json2csv = require('json2csv');
const moment = require('moment');
const fs = require('fs');
var port;
var parser;
var sampling;
var log_arr = [];
var db = new Database();


function scan_devices(cb) {
  serialport.list(function(err, devices) {
    $("#devices_list").html(devices.map(dev => {
      var ret = "<tr>\n";
      ret += "<td><button data-loading-text=\"Connecting...\" type=\"button\" class=\"device_btn btn btn-default\" onclick=\"connect_device(this)\">" + dev.comName + "</button></td>\n";
      ret += "<td>" + dev.manufacturer + "</td>\n";
      ret += "<td>" + dev.vendorId + "</td>\n";
      ret += "<td>" + dev.productId + "</td>\n";
      return ret;      
    }).join('\n'));
    console.log(devices);
  });
}

function take_sample() {
  port.write("REP\n", function(err) {
    if(err) {
      disconnect_device();
      $("#error_msg").show();
      $("#error_msg").html(err);
    }
  });
}

function app_log(line) {
  log_arr = [$.format.date(new Date(), 'yyyy/MM/dd HH:mm:ss')+': '+line].concat(log_arr).slice(0, 50);
  $("#log").html(log_arr.join("\n"));
}

function on_serial_data(line) {
  var values = line.split(", ");
  app_log("Channel 0: " + values[0] + ", Channel 1: " + values[1]);
  console.log("DB");
  db.insertCurrentSample(values);
}

function connect_device(button) {
  $("#error_msg").html("");
  $("#error_msg").hide();
  $(".device_btn").attr("disabled", true);
  $(button).button('loading');
  port = new serialport($(button).html(), { autoOpen: false, baudRate: 115200, parser: serialport.parsers.readline("\n")});
  port.open(err => {
    $(button).button('reset');
    if(err) {
      $("#error_msg").show();
      $("#error_msg").html(err);
    } else {
      $(".stage0").hide();
      $(".stage1").show();
      port.on('data', on_serial_data);
      sampling = setInterval(take_sample, parseInt($("#sample_time").val()) * 1000);
      app_log("Connected!");
      app_log("Sampling every " + $("#sample_time").val() + " second(s)");
    }
  });
}

function disconnect_device() {
  if(sampling) {
    clearInterval(sampling);
    sampling = null;
  }
  if(port && port.isOpen())
    port.close();
  $(".device_btn").removeAttr("disabled");
  $(".stage1").hide();
  $(".stage0").show();
}

function export_to_csv(path) {
  var fields = ['n', 'channel_0', 'channel_1', 'time'];
  db.Sample.findAll({
    where: {
      createdAt: {
        $gte: moment($("#export_from").val()).toDate()
      }
    }
  }).then(samples => {
    samples = samples.map((s,i) => {
      s.n = i;
      s.time = moment(s.createdAt).format("DD/MM/YYYY HH:mm:ss");
      return s;
    });
    var csv = json2csv({ data: samples, fields: fields });
    fs.writeFile(path || "samples.csv", csv, function(err) {
      if (err)
        console.error(err);
      else
        app_log("CSV exported succesfully to " + (path || "samples.csv"));
    });
  });
}

document.addEventListener('DOMContentLoaded', function() {
  $(".stage1").hide();
  $("#error_msg").hide();
  var csv_chooser = $("#csv_path");
  csv_chooser.unbind('change');
  csv_chooser.change(function(evt) {
    export_to_csv($(this).val());
    $(this).val('');
  });
  $("#export_from").val(moment().format("YYYY-MM-DD"));
});

var win = require('nw.gui').Window.get();
win.on('close', function() {
  disconnect_device();
  db.close();
  this.close(true);
});