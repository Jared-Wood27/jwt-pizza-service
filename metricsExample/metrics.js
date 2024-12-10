const config = require('./config.json');

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;

    // This will periodically sent metrics to Grafana
    const timer = setInterval(() => {
      this.sendMetricToGrafana('request', 'all', 'total', this.totalRequests);
      this.sendMetricToGrafana('request', 'GET', 'total', this.getRequests);
      this.sendMetricToGrafana('request', 'POST', 'total', this.postRequests);
      this.sendMetricToGrafana('request', 'DELETE', 'total', this.deleteRequests);
    }, 10000);
    timer.unref();
  }

  incrementRequests(method) {
    this.totalRequests++;
    switch (method) {
      case 'GET':
        this.getRequests++;
        break;
      case 'POST':
        this.postRequests++;
        break;
      case 'DELETE':
        this.deleteRequests++;
        break;
      default:
        break;
    }
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    const metric = `${metricPrefix},source=${config.source},method=${httpMethod} ${metricName}=${metricValue}`;

    fetch(`${config.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.userId}:${config.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.error('Failed to push metrics data to Grafana');
        } else {
          console.log(`Pushed ${metric}`);
        }
      })
      .catch((error) => {
        console.error('Error pushing metrics:', error);
      });
  }
}

const metrics = new Metrics();
module.exports = metrics;