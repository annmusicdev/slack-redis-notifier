const fetch = require('node-fetch');
const { isString, isHttpUrl } = require('@bolajiolajide/utils');

function SlackRedisNotifier(redisClient, webhookUrl, host = '') {
  if (!webhookUrl) {
    throw new Error('Webhook URL is not provided.');
  }

  if (!isString(webhookUrl) || !isHttpUrl(webhookUrl)) {
    throw new Error('Webhook URL isn\'t a valid URL. Please check again');
  }

  if (!redisClient || !redisClient.on) {
    throw new Error('Redis instance isn\'t valid. Please verify again.');
  }

  this.slackWebhookUrl = webhookUrl;
  this.hasErrorOccured = false;

  this.client = redisClient;
  this.host = host;

  this.client.on('error', this.onError);
  this.client.on('connect', this.onConnect);
  this.client.on('ready', this.onReady);
}

SlackRedisNotifier.prototype.getMessage = function (isSuccessful) {
  if (isSuccessful) {
    return `SRN: Connection to ${this.host}'s redis instance is successful`;
  }
  return `SRN: Failed to connect to ${this.host}'s redis instance. Please check the server.`;
};

SlackRedisNotifier.prototype.sendSlackNotification = async function(isSuccessful) {
  const message = this.getMessage(isSuccessful);

  return fetch(this.webhookUrl, {
    method: 'POST',
    body: JSON.stringify({
      text: message
    })
  });
}

SlackRedisNotifier.prototype.onError = async function() {
  console.log('======>>>>>>>>')
  if (this.hasErrorOccured) {
    console.log(`SRN: Notification has been sent to slack. Ignoring this second call.`);
    return;
  }

  try {
    await this.sendSlackNotification(false);
    this.hasErrorOccured = true;
  } catch (err) {
    console.log(err.message);
    console.log('failed ====>>>', this.hasErrorOccured)
    // fail silently because redis should try connecting in a few minutes
  }
};

SlackRedisNotifier.prototype.onConnect = async function() {
  if (this.hasErrorOccured) {
    // send message to slack notifying everyone that the connection is now okay
    await this.sendSlackNotification(true);
  }

  this.hasErrorOccured = false;
  console.log('SRN: Successfully connected to the redis instance.');
};

SlackRedisNotifier.prototype.onReady = async function() {
  if (this.hasErrorOccured) {
    // send message to slack notifying everyone that the connection is now okay
    await this.sendSlackNotification(true);
  }

  this.hasErrorOccured = false;
  console.log('SRN: Ready to connect because a connection has been established.')
}

module.exports = SlackRedisNotifier;
