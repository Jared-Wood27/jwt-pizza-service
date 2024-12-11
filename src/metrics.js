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
    this.averageReqTime = 0;
    this.averagePizzaTime = 0;

    this.reqLatencies = [];
    this.pizzaLatencies = [];

    this.requestTracker = this.requestTracker.bind(this);
    this.incrementUsers = this.incrementUsers.bind(this);
    this.decrementUsers = this.decrementUsers.bind(this);
    this.incrementGoodAuthRequests = this.incrementGoodAuthRequests.bind(this);
    this.incrementBadAuthRequests = this.incrementBadAuthRequests.bind(this);
    this.incrementPizzasSold = this.incrementPizzasSold.bind(this);
    this.incrementFailedPizzas = this.incrementFailedPizzas.bind(this);
    this.incrementRevenue = this.incrementRevenue.bind(this);
    this.addReqLatency = this.addReqLatency.bind(this);
    this.addPizzaLatency = this.addPizzaLatency.bind(this);

  }


  requestTracker(req, res, next) { //pass in rec 
    const startTime = Date.now();
    const method = req.method;
    this.totalRequests++;
    console.log(method);
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
    const latency = Date.now() - startTime;
    this.addReqLatency(latency);
    next();
  }

  // Increment active user counter (e.g., login or signup)
  incrementUsers() {
    console.log("add user");
    this.activeUsers++;
  }

  // decrement active user counter (e.g., logout)
  decrementUsers() {
    console.log("remove user");
    this.activeUsers--;
  }

  // Increment authentication request counter
  incrementGoodAuthRequests() {
    console.log("add good auth");
    this.goodAuthRequests++;
  }

  incrementBadAuthRequests() {
    console.log("add bad auth");
    this.badAuthRequests++;
  }

  // Increment pizzas sold counter
  incrementPizzasSold() {
    console.log("add sold pizza");
    this.pizzasSold++;
  }

  // Increment failedPizzas counter
  incrementFailedPizzas() {
    console.log("add failed pizza");
    this.failedPizzas++;
  }

  // Increment total revenue
  incrementRevenue(newPrice) {
    console.log("update revenue");
    this.pizzaRevenue = this.pizzaRevenue + newPrice;
  }

  // get latency - pizza or request
  addReqLatency(time) {
    console.log("add req time");
    this.reqLatencies.push(time);
  }

  addPizzaLatency(time){
    console.log("add pizza creation time");
    this.pizzaLatencies.push(time);
  }

  // Periodically report all metrics to Grafana
  reportMetricsRepeatedly() {
    // This will periodically sent metrics to Grafana npm run run to test locally rather then waiting for the pipeline
    const timer = setInterval(() => {
      try {
        this.sendMetricToGrafana('request', 'ALL', 'ALLRequests', this.totalRequests);
        this.sendMetricToGrafana('request', 'GET', 'GETRequests', this.getRequests);
        this.sendMetricToGrafana('request', 'POST', 'POSTRequests', this.postRequests);
        this.sendMetricToGrafana('request', 'DELETE', 'DELETERequests', this.deleteRequests);
        this.sendMetricToGrafana('request', 'PUT', 'PUTRequests', this.putRequests);

        // Report user-related metrics (e.g., active users) 
        //sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue)
        this.sendMetricToGrafana('user', 'USER', 'Active Users', this.activeUsers);
        //this.sendMetricToGrafana('Active Users', this.activeUsers);

        // Report auth-related metrics
        this.sendMetricToGrafana('auth', 'GOODAUTH', 'goodAuths', this.goodAuthRequests);
        this.sendMetricToGrafana('auth', 'BADAUTH', 'badAuths', this.badAuthRequests);
        
        // Report pizza-related metrics
        this.sendMetricToGrafana('purchase', 'requests', 'pizzasSoldCount', this.pizzasSold);
        this.sendMetricToGrafana('purchase', 'requests', 'failedPizzasCount', this.failedPizzas);
        this.sendMetricToGrafana('purchase', 'requests', 'totalRevenue', this.pizzaRevenue);

        //report general latency
        for (let i = 0; i < this.reqLatencies.length; i++){
          this.averageReqTime = this.averageReqTime + this.reqLatencies[i];
        }
        this.sendMetricToGrafana('latency', 'requestLatency', 'requestTime', (this.averageReqTime / this.reqLatencies.length));
        for (let i = 0; i < this.pizzaLatencies.length; i++){
          this.averagePizzaTime = this.averagePizzaTime + this.pizzaLatencies[i];
        }
        this.sendMetricToGrafana('latency', 'pizzaLatency', 'PizzaCreationTime', (this.averagePizzaTime / this.pizzaLatencies.length));

        // Report system-related metrics (CPU and memory usage)
        this.sendMetricToGrafana('system', 'cpu', 'cpuUsage', this.getCpuUsagePercentage());
        this.sendMetricToGrafana('system', 'memory', 'memUsage', this.getMemoryUsagePercentage());
        console.log("\n log divider \n");
      } catch (error) {
        console.log('Error sending metrics', error);
      }
    }, 10000); //report every 10 seconds
    timer.unref();
  }

  sendMetricToGrafana(metricPrefix, httpMethod, metricName, metricValue) {
    //const metric = `${metricName}=${metricValue}`;
    const metric = `${metricPrefix},source=${config.metrics.source},method=${httpMethod} ${metricName}=${metricValue}`;

    fetch(`${config.metrics.url}`, {
      method: 'post',
      body: metric,
      headers: { Authorization: `Bearer ${config.metrics.userId}:${config.metrics.apiKey}` },
    })
      .then((response) => {
        if (!response.ok) {
          console.log(httpMethod, metricName);
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