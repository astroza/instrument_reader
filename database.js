/*
 * Author: felipe@astroza.cl
 */
const Sequelize = require('sequelize');
const path = require('path');
const os = require('os');
function Database() {
  this.sequelize = new Sequelize(null, null, null, {
    dialect: 'sqlite',
    storage: path.join(os.homedir(), 'samples.sqlite'),
    logging: function() {}
  });

  this.Sample = this.sequelize.define('sample', {
    channel_0: {
      type: Sequelize.FLOAT
    },
    channel_1: {
      type: Sequelize.FLOAT
    }
  }, {
    freezeTableName: true
  });
  
  this.Sample.sync();
}

Database.prototype.insertCurrentSample = function(values) {
  this.Sample.create({channel_0: parseFloat(values[0]), channel_1: parseFloat(values[1])})
  .catch(err => console.log(err));
};

Database.prototype.close = function() {
  this.sequelize.close();
}