const config = require('./config.js');
const os = require('os');

class Metrics {
  constructor() {
    this.totalRequests = 0;
    this.getRequests = 0;
    this.postRequests = 0;
    this.deleteRequests = 0;
    this.putRequests = 0;
    this.activeUsers = 0;
    this.goodAuthRequests = 0;
    this.badAuthRequests = 0;
    this.pizzasSold = 0;
    this.failedPizzas = 0;
    this.pizzaRevenue = 0;
    this.responseTime = 0;

    // This will periodically sent metrics to Grafana
    const timer = setInterval(() => {
      this.reportMetrics();
    }, 10000); //report every 10 seconds
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
      case 'PUT':
        this.putRequests++;
        break;
      default:
        break;
    }
  }

  // Increment active user counter (e.g., login or signup)
  incrementUsers() {
    this.activeUsers++;
  }

  // decrement active user counter (e.g., logout)
  decrementUsers() {
    this.activeUsers--;
  }

  // Increment authentication request counter
  incrementGoodAuthRequests() {
    this.goodAuthRequests++;
  }

  IncrementBadAuthRequests() {
    this.badAuthRequests++;
  }

  // Increment pizzas sold counter
  incrementPizzasSold() {
    this.pizzasSold++;
  }

  // Increment failedPizzas counter
  incrementFailedPizzas() {
    this.failedPizzas++;
  }

  // Increment total revenue
  incrementRevenue(newPrice) {
    this.pizzaRevenue = this.pizzaRevenue + newPrice;
  }

  // get latency - pizza or request
  getLatency(start, end) {
    this.responseTime = end - start;
  }

  // Periodically report all metrics to Grafana
  reportMetrics() {
    // Report HTTP request-related metrics
    this.sendMetricToGrafana('request', 'all', 'allRequests', this.totalRequests);
    this.sendMetricToGrafana('request', 'GET', 'allGets', this.getRequests);
    this.sendMetricToGrafana('request', 'POST', 'allPosts', this.postRequests);
    this.sendMetricToGrafana('request', 'DELETE', 'allDeletes', this.deleteRequests);
    this.sendMetricToGrafana('request', 'PUT', 'allPuts', this.putRequests);

    // Report user-related metrics (e.g., active users) 
    //sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue)
    this.sendMetricToGrafana('user', 'actions', 'activeUsers', this.activeUsers);

    // Report auth-related metrics
    this.sendMetricToGrafana('auth', 'requests', 'goodAuths', this.goodAuthRequests);
    this.sendMetricToGrafana('auth', 'requests', 'badAuths', this.badAuthRequests);
    
    // Report pizza-related metrics
    this.sendMetricToGrafana('purchase', 'requests', 'pizzasSoldCount', this.pizzasSold);
    this.sendMetricToGrafana('purchase', 'requests', 'failedPizzasCount', this.failedPizzas);
    this.sendMetricToGrafana('purchase', 'requests', 'totalRevenue', this.pizzaRevenue);

    //report general latency
    this.sendMetricToGrafana('latency', 'requests', 'responseTime', this.responseTime);

    // Report system-related metrics (CPU and memory usage)
    this.sendMetricToGrafana('system', 'cpu', 'usage', this.getCpuUsagePercentage());
    this.sendMetricToGrafana('system', 'memory', 'usage', this.getMemoryUsagePercentage());
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

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return cpuUsage.toFixed(2) * 100;
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return memoryUsage.toFixed(2);
  }
}

const metrics = new Metrics();
module.exports = metrics;