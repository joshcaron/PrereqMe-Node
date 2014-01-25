$(function() {
  $.getJSON('ajax/department_list.json', function(data) {
    $( "#dept" ).autocomplete({
        source: data
    });
  });
}); 