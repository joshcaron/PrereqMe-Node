$(document).ready(function() {

var width = 1300,
    height = 650;

var x = d3.scale.linear()
    .range([0, width]);

var y = d3.scale.linear()
    .range([0, height]);

var colors = [["#3182bd", "#6baed6", "#9ecae1", "#c6dbef"], ["#e6550d", "#fd8d3c", "#fdae6b", "#fdd0a2"], ["#31a354", "#74c476", "#a1d99b", "#c7e9c0"], ["#756bb1", "#9e9ac8", "#bcbddc", "#dadaeb"], ["#393b79", "#5254a3", "#6b6ecf", "#9c9ede"], ["#637939", "#8ca252", "#b5cf6b", "#cedb9c"], ["#8c6d31", "#bd9e39", "#e7ba52", "#e7cb94"], ["#843c39", "#ad494a", "#d6616b", "#e7969c"], ["#7b4173", "#a55194", "#ce6dbd", "#de9ed6"]]
var next_hue = 0;
var root_color = "#624c22";
var failsafe_color = "#bdbdbd";

function id (course){ return course.dept +" "+ course.num; }
var courses = d3.map();

var partition = d3.layout.partition()
    .children(function(d) {
        return d.prereqs.length == 0 ? null : [].concat.apply([], d.prereqs.map(
            function(or_clause_ids){
                 return or_clause_ids.map(function(or_id){
                    if (!courses.get(or_id)){
                        console.log("WARNING: Prereq "+or_id+" was listed but not provided!");
                    }
                    return courses.get(or_id);
                });
            }))
       })
    .value(function(d) { return 1 });

var svg = d3.select("#svg").append("svg")
    .attr("width", width)
    .attr("height", height);

var rects, labels1, labels2, labels_coreq, coreqs;

d3.json("http://localhost:8888/api/courses/"+root_dept+"/"+root_num, function(error, json) {
    //build the map
    json.root.color = [root_color];
    function intake(obj){
        obj.root.num = obj.root.num+"";
        courses.set(id(obj.root), obj.root);
        if(obj.prereqs.length){
            obj.prereqs.forEach(function(xs){
                xs.forEach(function(d){intake(d); });
            });
        }
    }
    intake(json);

    //strip out bad coreqs
    courses.forEach(function(k,v){
        if (v.coreq){
            if (v.prereqs.length){
                v.coreq = null;
                return;
            }
            var c = courses.get(v.coreq)
            if (c.prereqs.length || +v.num > c.num){
                c.coreq = null;
            }else{
                v.coreq = null;
            }
        }
    });

    //remove missing prereqs
    if(root_dept == "ECON" && root_num == "3560"){
        //dirty hack!
        json.root.prereqs[3].splice(3,1);
    }
    courses.forEach(function(k,v){
        v.prereqs.forEach(function(xs){
            xs.forEach(function(d, i){
                if (!courses.get(d)){
                        xs.splice(i, 1);
                    }
                });
            });
    });

    var sel = svg.selectAll("rect")
        .data(partition(json.root))
        .enter();

    function assign_color(d){
        if (d.prereqs.length){
            d.prereqs = d.prereqs.sort(function(a,b){return a.length > b.length ? -1 : 1})
            d.prereqs.map(function(or_clause,i){
                if (i==0 && d != json.root){ //reuse parent hue for first, largest OR-clause
                    or_clause.map(function(c_id){
                        var c = courses.get(c_id)
                        c.hue = d.hue;
                        assign_color(c);
                    })
                }else{ //pick new hues for separate AND requirements
                    or_clause.map(function(c_id){
                        var c = courses.get(c_id)
                        c.hue = next_hue; next_hue++;
                        assign_color(c);
                    })
                }
            })
        }
    }
    assign_color(json.root);

    rects = sel.append("rect")
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y); })
      .attr("width", function(d) { return x(d.dx); })
      .attr("height", function(d) { return y(d.dy); })
      .attr("fill", function(d) { return d.color || colors[d.hue % colors.length][d.depth-1] || failsafe_color; })
      .on("click", clicked);

    var coreq_sel = svg.selectAll("foo") //empty selector
        .data(json.prereqs.concat(json.root).filter(function(d){return d.coreq != null}))
        .enter()

    coreqs = coreq_sel.append("rect")
        .each(function(d) {
            var c = courses.get(d.coreq);
                d.x = c.x + 0.1*c.dx;
                d.y = c.y + 0.7*c.dy;;
                d.dx = 0.8*c.dx;
                d.dy = 0.2*c.dy;
                d.color = d3.rgb(c.color || colors[c.hue][c.depth-1] || failsafe_color).brighter(0.3);
        })
        .attr("x", function(d) { return x(d.x); })
        .attr("y", function(d) { return y(d.y); })
        .attr("width", function(d) { return x(d.dx); })
        .attr("height", function(d) { return y(d.dy); })
        .attr("fill", function(d) { return d.color; })
        .style("stroke", "none")

    label_coreq = coreq_sel.append("text")
        .attr("transform", function(d){
            var c = courses.get(d.coreq);
            return "translate("+x(c.x+c.dx/2)+","+(y(c.y+c.dy*0.84))+")"})
        .attr("class", "label_coreq")
        .attr("text-anchor", "middle")
        .text(function(d){return d.dept +" "+ d.num});

    labels1 = sel.append("text")
      .attr("transform", function(d){return "translate("+x(d.x+d.dx/2)+","+(y(d.y+d.dy/2)-10)+")"})
      .attr("class", "label1")
      .attr("text-anchor", "middle")
      .text(function(d){return d.dept +" "+ d.num})
      .style("opacity", function(d){
          var text_w = this.getBBox().width;
          var box_w = x(d.x + d.dx) - x(d.x);
          console.log(text_w, box_w);
          return text_w > box_w ? "0" : "1";
      })

    labels2 = sel.append("text")
      .attr("transform", function(d){return "translate("+x(d.x+d.dx/2)+","+(y(d.y+d.dy/2)+10)+")"})
      .attr("class", "label2")
      .attr("text-anchor", "middle")
      .text(function(d){return d.name})
      .style("opacity", function(d){
          var text_w = this.getBBox().width;
          var box_w = x(d.x + d.dx) - x(d.x);
          console.log(text_w, box_w);
          return text_w > box_w ? "0" : "1";
      })

});

var last_clicked = null;
function clicked(d) {
  if (d == last_clicked) {return;}
  last_clicked = d;

  x.domain([d.x, d.x + d.dx]);
  y.domain([d.y, 1]).range([d.y ? 20 : 0, height]);

  rects.transition()
      .duration(750)
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y); })
      .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
      .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });

  labels1.transition()
      .duration(750)
      .attr("transform", function(d){return "translate("+x(d.x+d.dx/2)+","+(y(d.y+d.dy/2)-10)+")"})
      .style("opacity", function(d){
          var text_w = this.getBBox().width;
          var box_w = x(d.x + d.dx) - x(d.x);
          console.log(text_w, box_w);
          return text_w > box_w ? "0" : "1";
      })

  labels2.transition()
      .duration(750)
      .attr("transform", function(d){return "translate("+x(d.x+d.dx/2)+","+(y(d.y+d.dy/2)+10)+")"})
      .style("opacity", function(d){
          var text_w = this.getBBox().width;
          var box_w = x(d.x + d.dx) - x(d.x);
          console.log(text_w, box_w);
          return text_w > box_w ? "0" : "1";
      })

  coreqs.transition()
      .duration(750)
      .attr("x", function(d) { return x(d.x); })
      .attr("y", function(d) { return y(d.y); })
      .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
      .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });

  label_coreq.transition()
      .duration(750)
      .attr("transform", function(d){
        var c = courses.get(d.coreq);
        return "translate("+x(c.x+c.dx/2)+","+(y(c.y+c.dy*0.84))+")"
    })

  svg.selectAll(".label_top")
    .remove();

  var p = d.parent;
  if (p){
      svg.append("text")
          .transition()
          .delay(700)
          .duration(50)
          .attr("transform", "translate("+x(d.x+d.dx/2)+","+(y(p.y+p.dy)-4)+")")
          .attr("class", "label_top")
          .attr("text-anchor", "middle")
          .text(p.dept+" "+p.num+": "+p.name);
    }

}
});