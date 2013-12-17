// ./artemplateanalyseswidget.pt
// ../../../browser/widgets/artemplateanalyseswidget.py

// Most of this code is shared in ../../../browser/js/ar_analyses.pt
// There are a few differences, because this widget holds a dictionary,
// where the AR form reads and writes ARAnalysesField.
// Also note, the form_id is different, so checkboxes are called
// analyses_cb_* here, an list_cb_* there, ar_x_Analyses there, uids:list here.

(function( $ ) {

////////////////////////////////////////
function expand_cat(service_uid){
	cat = $("[name='Partition."+service_uid+":records']").parents('tr').attr('cat');
	th = $("th[cat='"+cat+"']");
	if ($(th).hasClass("collapsed")){
		table = $(th).parents(".bika-listing-table");
		// show sub TR rows
		$(table)
			.children("tbody")
			.children("tr[cat='"+cat+"']")
			.toggle(true);
		$(th).removeClass("collapsed").addClass("expanded");
	}
}

////////////////////////////////////////
function check_service(service_uid){
	// Add partition dropdown
	element = $("[name='Partition."+service_uid+":records']");
	select = "<select class='listing_select_entry' "+
		"name='Partition."+service_uid+":records' "+
		"field='Partition' uid='"+service_uid+"' "+
		"style='font-size: 100%'>";
	$.each($("#partitions td.part_id"), function(i,v){
		partid = $($(v).children()[1]).text();
		select = select + "<option value='"+partid+"'>"+partid+"</option>";
	});
	select = select + "</select>";
	$(element).after(select);
	// remove hidden field
	$(element).remove();
	expand_cat(service_uid);
}

////////////////////////////////////////
function uncheck_service(service_uid){
	element = $("[name='Partition."+service_uid+":records']");
	$(element).after(
		"<input type='hidden' name='Partition."+service_uid+":records'"+
		"value=''/>"
	);
	$(element).remove();
}

////////////////////////////////////////

function add_Yes(dlg, element, dep_services){
	for(var i = 0; i<dep_services.length; i++){
		var service_uid = dep_services[i].Service_uid;
		if(! $("#analyses_cb_"+service_uid).prop("checked") ){
			check_service(service_uid);
			$("#analyses_cb_"+service_uid).prop("checked",true);
			expand_cat(service_uid);
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
				if ($("#analyses_cb_"+dep.Service_uid).prop("checked") ){
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
				cb = $("#analyses_cb_" + dep.Service_uid);
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
						cb = $("#analyses_cb_" + dep.Service_uid);
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
									cb = $("#analyses_cb_" + dep.Service_uid);
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

//////////////////////////////////////
function addPart(container,preservation){
	if(container == null || container == undefined){
		container = '';
	} else {
		container = container[0];
	}
	if(preservation == null || preservation == undefined){
		preservation = '';
	} else {
		preservation = preservation[0];
	}
	highest_part = '';
	from_tr = '';
	$.each($("#partitions td.part_id"), function(i,v){
		partid = $($(v).children()[1]).text();
		if (partid > highest_part){
			from_tr = $(v).parent();
			highest_part = partid;
		}
	});
	highest_part = highest_part.split("-")[1];
	next_part = parseInt(highest_part,10) + 1;

	// copy and re-format new partition table row
	uid	= $(from_tr).attr("uid");
	to_tr = $(from_tr).clone();
	$(to_tr).attr("id", "folder-contents-item-part-"+next_part);
	$(to_tr).attr("uid", "part-"+next_part);
	$(to_tr).find("#"+uid+"_row_data").attr('id', "part-"+next_part+"_row_data").attr("name", "row_data."+next_part+":records");
	$(to_tr).find("#"+uid).attr('id', 'part-'+next_part);
	$(to_tr).find("input[value='"+uid+"']").attr('value', 'part-'+next_part);
	$(to_tr).find("[uid='"+uid+"']").attr('uid', 'part-'+next_part);
	$(to_tr).find("span[uid='"+uid+"']").attr('uid', 'part-'+next_part);
	$(to_tr).find("input[name^='part_id']").attr('name', "part_id.part-"+next_part+":records").attr('value', 'part-'+next_part);
	$(to_tr).find("select[field='container_uid']").attr('name', "container_uid.part-"+next_part+":records");
	$(to_tr).find("select[field='preservation_uid']").attr('name', "preservation_uid.part-"+next_part+":records");
	$($($(to_tr).children("td")[0]).children()[1]).empty().append("part-"+next_part);

	// set part and container values
	$(to_tr).find("select[field='container_uid']").val(container);
	$(to_tr).find("select[field='preservation_uid']").val(preservation);
	$($("#partitions tbody")[0]).append($(to_tr));

	// add this part to Partition selectors in Analyses tab
	$.each($("select[name^='Partition\\.']"), function(i,v){
		$(v).append($("<option value='part-"+next_part+"'>part-"+next_part+"</option>"));
	});
}

////////////////////////////////////////
function calc_parts_handler(data){
	var parts = data.parts;
	var i;
	// reset partition table
	for (i = $(".records_row_Partitions").length - 1; i >= 1; i--) {
		var e = $(".records_row_Partitions")[i];
		// remove part from Partition selector dropdowns
		var part = $($(e).find("input[id*='Partitions-part_id']")[0]).val();
		$("select[name^='Partition\\.']").find("option[value='"+part+"']").remove();
		// remove row from partition list
		$(e).remove();
	}
  // Edit existing first row
	if (parts.length > 0){
		setPartitionFields(0, parts[0]);
	}
	// Add rows and set container and preservation of part-2 and up
	for(i = 1; i < parts.length; i++){
		$("#Partitions_more").click();
		setPartitionFields(i, parts[i]);
	}
}


////////////////////////////////////////
function setAnalysisProfile(){
	// get profile services list
	analysisprofiles = $.parseJSON($("#AnalysisProfiles").attr("value"));
	// clear existing selection
	$("input[id^='analyses_cb_']").filter(":checked").prop("checked", false);
	$.each($("select[name^='Partition']"), function(i,element){
		$(element).after(
			"<input type='hidden' name='"+$(element).attr('name')+"' value=''/>"
		);
		$(element).remove();
	});

	// select individual services
	profile_uid = $(this).val();
	service_uids = analysisprofiles[profile_uid];
	if (service_uids != undefined && service_uids != null) {
		$.each(service_uids, function(i,service_uid){
			check_service(service_uid);
			$("input[id^='analyses_cb_"+service_uid+"']").prop("checked", true);
		});
	}
	// calculate automatic partitions
	//calculate_parts();
}

////////////////////////////////////////
function click_uid_checkbox(){
	calcdependencies([this]);
	service_uid = $(this).val();
	if ($(this).prop("checked")){
		check_service(service_uid);
	} else {
		uncheck_service(service_uid);
	}
	$("#AnalysisProfile\\:list").val('');
}

$(document).ready(function(){

	_ = jarn.i18n.MessageFactory('bika');
	PMF = jarn.i18n.MessageFactory('plone');

	$("[name='uids:list']").live('click', click_uid_checkbox);

	$("#AnalysisProfile\\:list").change(setAnalysisProfile);

});
}(jQuery));
