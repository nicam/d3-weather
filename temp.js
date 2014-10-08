if (typeof (nicam) === 'undefined') {
    nicam = {};
}
if (typeof (nicam.AppName) === 'undefined') {
    nicam.temp = {};
}

nicam.temp = (function ($) {
  var margin = {top: 20, right: 20, bottom: 70, left: 40},
      width = 600 - margin.left - margin.right,
      height = 300 - margin.top - margin.bottom;

  var svg;
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
    svg = d3.select(".container").append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    svg.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + height + ")")
      .call(xAxis)
      .selectAll("text")
      .style("text-anchor", "end")
      .attr("dx", "-.8em")
      .attr("dy", "-.55em")
      .attr("transform", "rotate(-90)" );

    svg.append("g")
      .attr("class", "y axis")
      .call(yAxis)
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("y", 6)
      .attr("dy", ".71em")
      .style("text-anchor", "end")
      .text("Temp (C°)");

    update();
  }

  function updateData(action) {
    if (action == '+' && cache.length > 0) {
      weatherData.list.push(cache.pop());
    } else if (action == '-' && weatherData.list.length > 0) {
      cache.push(weatherData.list.pop());
    }
    render(weatherData.list);
  }


  function render(data) {
      data.forEach(function(d) {
        d.date = parseDate(d.dt_txt);
        d.value = d.main.temp - 273.15;
      });
      
      x.domain(data.map(function(d) { return d.date; }));
      // y.domain([0, d3.max(data, function(d) { return d.value; })]);
      var min = d3.min(data, function(d) { return d.value; });
      var max = d3.max(data, function(d) { return d.value; });
      // y.domain([ parseInt(min * 1.1), parseInt(max * 1.1)]);
      y.domain([0, 30]);

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
      dataObj.enter().append("rect")
      .attr("height", 0)
      .attr("y", 210)
      color.domain([0, 30]);

      // Add temperature label!

      dataObj
        .transition().ease(['height', 'y', 'x', 'width'])
        .attr("x", function(d) { return x(d.date); })
        .attr("width", x.rangeBand())
        .attr("class", function(d) { return "day q" + (8-color(d.value)) + "-9"; })
        .attr("y", function(d) { return y(d.value); })
        .attr("height", function(d) { return height - y(d.value); });
      
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
    })
  }

  var getWeather = function (location, country, callback) {
    var weather = "http://api.openweathermap.org/data/2.5/forecast?q="+location+","+country+"&mode=json";
    $.ajax({
      dataType: "jsonp",
      url: weather,
      success: callback
    });
  }

  return {
    getWeather: getWeather,
    updateData: updateData,
    update: update,
    init: init
  }
})(jQuery); 