(function( $ ) {
////////////////////////////////////////
function check_service(service_uid){
	// Add partition dropdown
	element = $("[name='Partition."+service_uid+":records']");
	select = '<select class="listing_select_entry" '+
		'name="Partition.'+service_uid+':records" '+
		'field="Partition" uid="'+service_uid+'" '+
		'style="font-size: 100%">';
	$.each($('#partitions td.PartTitle'), function(i,v){
		partid = $($(v).children()[1]).text();
		select = select + '<option value="'+partid+'">'+partid+
			'</option>';
	});
	select = select + "</select>";
	$(element).after(select);

	// remove hidden field
	$(element).remove();

	// Add price field
	var logged_in_client = $("input[name='logged_in_client']").val();
	if (logged_in_client != "1") {
		element = $("[name='Price."+service_uid+":records']");
		price = '<input class="listing_string_entry numeric" '+
			'name="Price.'+service_uid+':records" '+
			'field="Price" type="text" uid="'+service_uid+'" '+
			'autocomplete="off" style="font-size: 100%" size="5" '+
			'value="'+$(element).val()+'">';
		$(element).after(price);
		// remove hidden field and price label
		$($(element).siblings()[1]).remove();
		$(element).remove();
	}
}

////////////////////////////////////////
function uncheck_service(service_uid){
	element = $("[name='Partition."+service_uid+":records']");
	$(element).after(
		"<input type='hidden' name='Partition."+service_uid+":records'"+
		"value=''/>"
	);
	$(element).remove();

	var logged_in_client = $("input[name='logged_in_client']").val();
	if (logged_in_client != "1") {
		element = $("[name='Price."+service_uid+":records']");
		$($(element).siblings()[0]).after(' <span class="state-active state-active ">'+$(element).val()+'</span>')
		$(element).after(
			"<input type='hidden' name='Price."+service_uid+":records'"+
			"value='"+$(element).val()+"'/>"
		);
		$(element).remove();
	}
}

function add_Yes(dlg, element, dep_services){
	for(var i = 0; i<dep_services.length; i++){
		var service_uid = dep_services[i].Service_uid;
		if(! $("#list_cb_"+service_uid).prop("checked") ){
			check_service(service_uid);
			$("#list_cb_"+service_uid).prop("checked",true);
		}
	}
	$(dlg).dialog("close");
	$("#messagebox").remove();
}

function add_No(dlg, element){
	if($(element).prop("checked") ){
		uncheck_service($(element).attr("value"));
		$(element).prop("checked",false);
	}
	$(dlg).dialog("close");
	$("#messagebox").remove();
}

function calcdependencies(elements, auto_yes) {
	/*jshint validthis:true */
	auto_yes = auto_yes || false;
	var _ = window.jarn.i18n.MessageFactory("bika");

	var dep;
	var i, cb;

	var lims = window.bika.lims;

	for(var elements_i = 0; elements_i < elements.length; elements_i++){
		var dep_services = [];  // actionable services
		var dep_titles = [];
		var element = elements[elements_i];
		var service_uid = $(element).attr("value");
		// selecting a service; discover dependencies
		if ($(element).prop("checked")){
			var Dependencies = lims.AnalysisService.Dependencies(service_uid);
			for(i = 0; i<Dependencies.length; i++) {
				dep = Dependencies[i];
				if ($("#list_cb_"+dep.Service_uid).prop("checked") ){
					continue; // skip if checked already
				}
				dep_services.push(dep);
				dep_titles.push(dep.Service);
			}
			if (dep_services.length > 0) {
				if (auto_yes) {
					add_Yes(this, element, dep_services);
				} else {
					var html = "<div id='messagebox' style='display:none' title='" + _("Service dependencies") + "'>";
					html = html + _("<p>${service} requires the following services to be selected:</p>"+
													"<br/><p>${deps}</p><br/><p>Do you want to apply these selections now?</p>",
													{
														service: $(element).attr("title"),
														deps: dep_titles.join("<br/>")
													});
					html = html + "</div>";
					$("body").append(html);
					$("#messagebox").dialog({
						width:450,
						resizable:false,
						closeOnEscape: false,
						buttons:{
							yes: function(){
								add_Yes(this, element, dep_services);
							},
							no: function(){
								add_No(this, element);
							}
						}
					});
				}
			}
		}
		// unselecting a service; discover back dependencies
		else {
			var Dependants = lims.AnalysisService.Dependants(service_uid);
			for (i=0; i<Dependants.length; i++){
				dep = Dependants[i];
				cb = $("#list_cb_" + dep.Service_uid);
				if (cb.prop("checked")){
					dep_titles.push(dep.Service);
					dep_services.push(dep);
				}
			}
			if(dep_services.length > 0){
				if (auto_yes) {
					for(i=0; i<dep_services.length; i+=1) {
						dep = dep_services[i];
						service_uid = dep.Service_uid;
						cb = $("#list_cb_" + dep.Service_uid);
						uncheck_service(dep.Service_uid);
						$(cb).prop("checked", false);
					}
				} else {
					$("body").append(
						"<div id='messagebox' style='display:none' title='" + _("Service dependencies") + "'>"+
						_("<p>The following services depend on ${service}, and will be unselected if you continue:</p><br/><p>${deps}</p><br/><p>Do you want to remove these selections now?</p>",
							{service:$(element).attr("title"),
							deps: dep_titles.join("<br/>")})+"</div>");
					$("#messagebox").dialog({
						width:450,
						resizable:false,
						closeOnEscape: false,
						buttons:{
							yes: function(){
								for(i=0; i<dep_services.length; i+=1) {
									dep = dep_services[i];
									service_uid = dep.Service_uid;
									cb = $("#list_cb_" + dep.Service_uid);
									$(cb).prop("checked", false);
									uncheck_service(dep.Service_uid);
								}
								$(this).dialog("close");
								$("#messagebox").remove();
							},
							no:function(){
								service_uid = $(element).attr("value");
								check_service(service_uid);
								$(element).prop("checked", true);
								$("#messagebox").remove();
								$(this).dialog("close");
							}
						}
					});
				}
			}
		}
	}
}

$(document).ready(function(){

	_ = jarn.i18n.MessageFactory('bika');
	PMF = jarn.i18n.MessageFactory('plone');

	////////////////////////////////////////
	// disable checkboxes for eg verified analyses.
	$.each($("[name='uids:list']"), function(i,cb){
		uid = $(cb).val();
		row_data = $.parseJSON($("#"+uid+"_row_data").val());
		if (row_data['disabled'] == true){
			// disabled fields must be shadowed by hidden fields,
			// or they don't appear in the submitted form.
			$(cb).prop("disabled", true);
			cbname = $(cb).attr("name");
			cbid = $(cb).attr("id");
			$(cb).removeAttr("name").removeAttr("id");
			$(cb).after("<input type='hidden' name='"+cbname+"' value='"+uid+"' id='"+cbid+"'/>");

			el = $("[name='Price."+uid+":records']");
			elname = $(el).attr('name');
			elval = $(el).val();
			$(el).after("<input type='hidden' name='"+elname+"' value='"+elval+"'/>");
			$(el).prop("disabled", true);

			el = $("[name='Partition."+uid+":records']");
			elname = $(el).attr("name");
			elval = $(el).val();
			$(el).after("<input type='hidden' name='"+elname+"' value='"+elval+"'/>");
			$(el).prop("disabled", true);
		}
	})

	////////////////////////////////////////
	// checkboxes in services list
	$("[name='uids:list']").live('click', function(){
		calcdependencies([this]);

		service_uid = $(this).val();
		if ($(this).prop('checked')){
			check_service(service_uid);
		}
		else {
			uncheck_service(service_uid);
		}
	});

});
}(jQuery));
