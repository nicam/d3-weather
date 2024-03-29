if (typeof (nicam) === 'undefined') {
    nicam = {};
}
if (typeof (nicam.temp) === 'undefined') {
    nicam.temp = {};
}

nicam.temp = (function ($) {
  var margin = {top: 20, right: 20, bottom: 70, left: 40},
      width = 600 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  var svg, svgGauge;
  var gauge, segDisplay;
  var parseDate = d3.time.format("%Y-%m-%d %H:%M:%S").parse;
  var x = d3.scale.ordinal().rangeRoundBands([0, width], .05);
  var y = d3.scale.linear().range([height, 0]);

  var cache = [];
  var weatherData;


  var color = d3.scale.quantile()
      .range(d3.range(9));

  var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom")
      .tickFormat(d3.time.format("%a %H:%M"));
   
  var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(10);
   
  var init = function () {
    svg = d3.select("#barchart").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Prepare xAxis
    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)

    // Prepare yAxis
    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Temp (C°)");

    svgGauge = d3.select("#speedometer")
      .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    gauge = iopctrl.arcslider()
      .radius(100)
      .events(false)
      .indicator(iopctrl.defaultGaugeIndicator);
    gauge.axis().orient("out")
      .normalize(true)
      .ticks(10)
      .tickSubdivide(5)
      .tickSize(10, 8, 10)
      .tickPadding(5)
      .scale(d3.scale.linear()
        .domain([-50, 50])
        .range([-3*Math.PI/4, 3*Math.PI/4]));

    segDisplay = iopctrl.segdisplay()
      .width(80)
      .digitCount(4)
      .negative(true)
      .decimals(1);
      
    svgGauge.append("g")
      .attr("class", "segdisplay")
      .attr("transform", "translate(260, 180)")
      .call(segDisplay);

    svgGauge.append("g")
      .attr("class", "gauge")
      .attr("transform", "translate(150, 0)")
      .call(gauge);

    var ticksminor = document.querySelectorAll(".tick.minor");
    buildTicks(ticksminor, 'danger', 45, ticksminor.length);
    buildTicks(ticksminor, 'danger', 0, 15);
    buildTicks(ticksminor, 'warn', 40, 45);
    buildTicks(ticksminor, 'good', 35, 40);

    var ticksmajor = document.querySelectorAll(".tick.major");
    buildTicks(ticksmajor, 'danger', 0, 3);
    buildTicks(ticksmajor, 'danger', 9, ticksmajor.length);
    buildTicks(ticksmajor, 'good', 7, 8);
    
    segDisplay.value(0);
    gauge.value(0);
    
    update();
  };

  function buildTicks(ticks, color, start, end) {
    for(var i=start; i< end; i++){
      ticks[i].classList.add(color);
    }
  }

  function updateData(action) {
    if (action == '+' && cache.length > 0) {
      weatherData.list.push(cache.pop());
      render(weatherData.list);
    } else if (action == '-' && weatherData.list.length > 0) {
      cache.push(weatherData.list.pop());
      render(weatherData.list);
    }
  }


  function render(data) {
      data.forEach(function(d) {
        d.date = parseDate(d.dt_txt);
        // Convert from Kelvin to Degree Celsius
        d.value = d.main.temp - 273.15;
      });
      
      x.domain(data.map(function(d) { return d.date; }));
      var min = d3.min(data, function(d) { return d.value; });
      var max = d3.max(data, function(d) { return d.value; });

      y.domain([ parseInt(min-1), parseInt(max+5)]);

      svg.selectAll("g .y.axis")
          .call(yAxis);

      var achsis = svg.selectAll("g .x.axis")
          .transition().ease(['x'])
          .call(xAxis);

      achsis.selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", "-.55em")
        .attr("transform", "rotate(-90)" );

      var dataObj = svg.selectAll("rect").data(data);

      // Build new rects if necessary
      dataObj.enter().append("rect")
      .attr("height", 0)
      .attr("y", 210)
      .on("mouseover", function(){
        this.classList.add("over");
        var temp = parseFloat(this.getAttribute("data-value")).toFixed(1);
        segDisplay.value(temp);
        gauge.value(temp);
      })
      .on("mouseout", function(){
        this.classList.remove("over");
      });
      color.domain([0, 30]);

      // Update Chart Data
      dataObj
        .transition().ease(['height', 'y', 'x', 'width'])
        .attr("x", function(d) { return x(d.date); })
        .attr("width", x.rangeBand())
        .attr("class", function(d) { return "day q" + (8-color(d.value)) + "-9"; })
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); })
        .attr("data-value", function(d) { return d.value; });
      
      // Remove elements
      dataObj.exit()
      .transition().ease(['height', 'y', 'x', 'width'])
      .attr("height", 0)
      .attr("y", 210)
      .remove();
  }

  var update = function () {
    var location = document.getElementById('location').value;
    var country = document.getElementById('country').value;
    getWeather(location, country, function (data) {
      data.list = data.list.slice(10, data.list.length);
      weatherData = data;
      render(weatherData.list);
    });
  };

  var getWeather = function (location, country, callback) {
    var weather = "http://api.openweathermap.org/data/2.5/forecast?q="+location+","+country+"&mode=json";
    $.ajax({
      dataType: "jsonp",
      url: weather,
      success: callback
    });
  };

  return {
    getWeather: getWeather,
    updateData: updateData,
    update: update,
    init: init
  }
})(jQuery); 