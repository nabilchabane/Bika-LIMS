(function( $ ) {

function recalc_prices(column){
	if(column){
		// recalculate just this column
		subtotal = 0.00;
		discount_amount = 0.00;
		vat = 0.00;
		total = 0.00;
		discount = parseFloat($("#member_discount").val());
		$.each($('input[name="ar.'+column+'.Analyses:list:ignore_empty:record"]'), function(){
			// For some browsers, `attr` is undefined; for others, its false.  Check for both.
			if(!($(this).prop('disabled')) && $(this).prop('checked')){
				serviceUID = this.id;
				form_price = parseFloat($("#"+serviceUID+"_price").val());
				vat_amount = parseFloat($("#"+serviceUID+"_price").attr("vat_amount"));
				if(discount){
					price = form_price - ((form_price / 100) * discount);
				} else {
					price = form_price;
				}
				subtotal += price;
				discount_amount += ((form_price / 100) * discount);
				vat += ((price / 100) * vat_amount);
				total += price + ((price / 100) * vat_amount);
			}
		});
		$('#ar_'+column+'_subtotal').val(subtotal.toFixed(2));
		$('#ar_'+column+'_subtotal_display').val(subtotal.toFixed(2));
		$('#ar_'+column+'_discount').val(discount_amount.toFixed(2));
		$('#ar_'+column+'_vat').val(vat.toFixed(2));
		$('#ar_'+column+'_vat_display').val(vat.toFixed(2));
		$('#ar_'+column+'_total').val(total.toFixed(2));
		$('#ar_'+column+'_total_display').val(total.toFixed(2));
	} else {
		// recalculate the entire form
		for (col=0; col<parseInt($("#col_count").val()); col++) {
			recalc_prices(String(col));
		}
	}
};

function changeReportDryMatter(){
	dm = $("#getDryMatterService")
	uid = $(dm).val();
	cat = $(dm).attr("cat");
	poc = $(dm).attr("poc");
	column = $(this).attr('column');
	if ($(this).prop('checked')){
		// only play with service checkboxes when enabling dry matter
		unsetAnalysisProfile(column);
		jQuery.ajaxSetup({async:false});
		toggleCat(poc, cat, $(this).attr("column"), selectedservices=[uid], force_expand=true);
		jQuery.ajaxSetup({async:true});
		dryservice_cb = $("input[column='"+$(this).attr("column")+"']:checkbox").filter("#"+uid);
		$(dryservice_cb).prop('checked') == true;
		calcdependencies([$(dryservice_cb)], auto_yes = true);
		calculate_parts(column);
	}
	recalc_prices();
}

function deleteSampleButton(){

	_ = jarn.i18n.MessageFactory('bika');
	PMF = jarn.i18n.MessageFactory('plone');

	var curDate = new Date();
	var y = curDate.getFullYear();
	var limitString = '1900:' + y;
	var dateFormat = _("date_format_short_datepicker");

	column = $(this).attr('column');
	$("#ar_"+column+"_SampleID_button").val($("#ar_"+column+"_SampleID_default").val());
	$("#ar_"+column+"_SampleID").val('');
	$("#ar_"+column+"_ClientReference").val('').prop('readonly', false);
	$("#ar_"+column+"_SamplingDate")
		.datepicker({
			showOn:'focus',
			showAnim:'',
			changeMonth:true,
			changeYear:true,
			dateFormat: dateFormat,
			yearRange: limitString
		})
		.click(function(){$(this).attr('value', '');})
		.attr('value', '');
	$("#ar_"+column+"_ClientSampleID").val('').prop('readonly', false);
	$("#ar_"+column+"_SamplePoint").val('').prop('readonly', false);
	$("#ar_"+column+"_SampleType").val('').prop('readonly', false);
	$("#ar_"+column+"_SamplingDeviation").val('').prop('disabled', false);
	$("#ar_"+column+"_Composite").prop('checked', false);
	$("#ar_"+column+"_Composite").prop('disabled', false);
	$("#ar_"+column+"_AdHoc").prop('checked', false);
	$("#ar_"+column+"_AdHoc").prop('disabled', false);
	$("#ar_"+column+"_DefaultContainerType").prop('disabled', false);
	$("#deleteSampleButton_" + column).toggle(false);
	// uncheck and enable all visible service checkboxes
	$.each($("input[id*='_"+column+"_']").filter(".cb"), function(i,e){
		$(v).prop('checked', false);
		$(v).prop('disabled', false);
	})
	uncheck_partnrs(column);
	recalc_prices();
}

function showSelectSample(){
	column = this.id.split("_")[1];
	window.open('ar_select_sample?column=' + column,
		'ar_select_sample','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=550');
}

function showSelectCC(){
	contact_uid = $('#primary_contact').val();
	cc_uids = $('#cc_uids').attr('value');
	url = window.location.href.split("?")[0].replace("/ar_add", "").replace("/analysisrequests","")
	window.open(url+'/ar_select_cc?hide_uids=' + contact_uid + '&selected_uids=' + cc_uids,
		'ar_select_cc','toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=600,height=550');
}

function changePrimaryContact(){
	contact_uid = $(this).val();
	elem = $("[uid='"+contact_uid+"']");
	cc_data = $.parseJSON($(elem).attr("ccs"));
	$('#cc_uids').attr('value', $(elem).attr("cc_uids"));
	$('#cc_titles').val($(elem).attr("cc_titles"));
}

function copyButton(){
	field_name = $(this).attr("name");
	if ($(this).hasClass('ARTemplateCopyButton')){ // Template selector
		first_val = $('#ar_0_ARTemplate').val();
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			$("#ar_"+col+"_ARTemplate").val(first_val);
		}
		$("[id*='_ARTemplate']").change();
	}
	else if ($(this).hasClass('AnalysisProfileCopyButton')){ // Profile selector
		first_val = $('#ar_0_AnalysisProfile').val();
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			$("#ar_"+col+"_AnalysisProfile").val(first_val);
		}
		$("[id*='_AnalysisProfile']").change();
	}
	else if ($(this).hasClass('SampleTypeCopyButton')){ // SampleType - Must set partitions on copy
		first_val = $('#ar_0_SampleType').val();
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			$("#ar_"+col+"_SampleType").val(first_val);
			$("#ar_"+col+"_SampleType").change();
		}
	}
	else if ($(this).hasClass('SamplingDeviationCopyButton')){ // Sampling Deviation
		first_val = $('#ar_0_SamplingDeviation').val();
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			$("#ar_"+col+"_SamplingDeviation").val(first_val);
		}
	}
	else if ($(this).hasClass('DefaultContainerTypeCopyButton')){ // Default Container Type
		first_val = $('#ar_0_DefaultContainerType').val();
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			$("#ar_"+col+"_DefaultContainerType").val(first_val);
		}
	}
	else if ($(this).parent().attr('class') == 'service'){ // Analysis Service checkbox
		first_val = $('input[column="0"]').filter('#'+this.id).prop('checked');
		affected_elements = [];
		// 0 is the first column; we only want to change cols 1 onward.
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			other_elem = $('input[column="'+col+'"]').filter('#'+this.id);
			disabled = other_elem.prop('disabled');
			// For some browsers, `attr` is undefined; for others, its false.  Check for both.
			if (disabled) {
				disabled = true;
			} else {
				disabled = false;
			}
			if (!disabled && !(other_elem.prop('checked')==first_val)) {
				other_elem.prop('checked', first_val?true:false);
				affected_elements.push(other_elem);
			}
			calculate_parts(col);
		}
		calcdependencies(affected_elements, true);
		recalc_prices();
	}
	else if ($('input[name^="ar\\.0\\.'+field_name+'"]').attr("type") == "checkbox") {
		// other checkboxes
		first_val = $('input[name^="ar\\.0\\.'+field_name+'"]').prop('checked');
		// col starts at 1 here; we don't copy into the the first row
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			other_elem = $('#ar_' + col + '_' + field_name);
			if (!(other_elem.prop('checked')==first_val)) {
				other_elem.prop('checked', first_val?true:false);
			}
		}
		$("[id*='_" + field_name + "']").change();
	}
	else{
		first_val = $('input[name^="ar\\.0\\.'+field_name+'"]').val();
		// col starts at 1 here; we don't copy into the the first row
		for (col=1; col<parseInt($("#col_count").val()); col++) {
			other_elem = $('#ar_' + col + '_' + field_name);
			if (!(other_elem.prop('disabled'))) {
				if(field_name == 'SampleType'){ calculate_parts(col); }
				other_elem.val(first_val);
			}
		}
		$("[id*=_'" + field_name + "']").change();
	}
}

function toggleCat(poc, category_uid, column, selectedservices,
                   force_expand, disable){
	// selectedservices and column are optional.
	// disable is used for field analyses - secondary ARs should not be able
	// to select these
	if(force_expand == undefined){ force_expand = false ; }
	if(disable == undefined){ disable = -1 ; }
	if(!column && column != 0) { column = ""; }

	tbody = $("#"+poc+"_"+category_uid);

	if($(tbody).hasClass("expanded")){
		// displaying an already expanded category
		if(selectedservices){
			for(service in tbody.children){
				service_uid = service.id;
				if(selectedservices.indexOf(service_uid) > -1){
					$(this).prop('checked', true);
				}
			}
			recalc_prices(column);
			$(tbody).toggle(true);
		} else {
			if (force_expand){ $(tbody).toggle(true); }
			else { $(tbody).toggle(); }
		}
	} else {
		if(!selectedservices) selectedservices = [];
		$(tbody).addClass("expanded");
		var options = {
			'selectedservices': selectedservices.join(","),
			'categoryUID': category_uid,
			'column': column,
			'disable': disable > -1 ? column : -1,
			'col_count': $("#col_count").attr('value'),
			'poc': poc
		};
		$(tbody).load("analysisrequest_analysisservices", options,
			function(){
				// analysis service checkboxes
				$("input[name*='Analyses']").unbind();
				$("input[name*='Analyses']").bind('change', service_checkbox_change);
				if(selectedservices!=[]){
					recalc_prices(column);
				}
			}
		);
	}
}
function add_Yes(dlg, element, dep_services){
	/*jshint validthis:true */
	var column = $(element).attr("column");
	var key, json_key, dep, i;
	var keyed_deps = {};
	for(i = 0; i<dep_services.length; i++){
		dep = dep_services[i];
		key = {
			col: column,
			poc: dep.PointOfCapture,
			cat_uid: dep.Category_uid
		};
		json_key = $.toJSON(key);
		if(!keyed_deps[json_key]){
			keyed_deps[json_key] = [];
		}
		keyed_deps[json_key].push(dep.Service_uid);
	}

	var modified_cols = [];
	for(json_key in keyed_deps){
		if (!keyed_deps.hasOwnProperty(json_key)){ continue; }
		key = $.parseJSON(json_key);
		if(!modified_cols[key.col]){
			modified_cols.push(key.col);
		}
		var service_uids = keyed_deps[json_key];
		var tbody = $("#"+key.poc+"_"+key.cat_uid);
		if($(tbody).hasClass("expanded")) {
			// if cat is already expanded, manually select service checkboxes
			$(tbody).toggle(true);
			for(i=0; i<service_uids.length; i++){
				var service_uid = service_uids[i];
				var e = $("input[column='"+key.col+"']").filter("#"+service_uid);
				$(e).prop("checked",true);
			}
		} else {
			// otherwise, toggleCat will take care of everything for us
			$.ajaxSetup({async:false});
			toggleCat(key.poc, key.cat, dep.col, service_uids);
			$.ajaxSetup({async:true});
		}
	}
	recalc_prices();
	for(i=0; i<modified_cols.length; i+=1){
		calculate_parts(modified_cols[i]);
	}
	$(dlg).dialog("close");
	$("#messagebox").remove();


}

function add_No(dlg, element){
	/*jshint validthis:true */
	$(element).prop("checked",false);
	$(dlg).dialog("close");
	$("#messagebox").remove();
}

function calcdependencies(elements, auto_yes) {
	/*jshint validthis:true */
	auto_yes = auto_yes || false;
	var _ = window.jarn.i18n.MessageFactory("bika");

	var dep;
	var dep_i, cb;

	var lims = window.bika.lims;

	for(var elements_i = 0; elements_i < elements.length; elements_i++){
		var dep_services = [];  // actionable services
		var dep_titles = [];
		var element = elements[elements_i];
		var column = $(element).attr("column");
		var service_uid = $(element).attr("id");
		var modified_cols = [];
		// selecting a service; discover dependencies
		if ($(element).prop("checked")){
			var Dependencies = lims.AnalysisService.Dependencies(service_uid);
			for(dep_i = 0; dep_i<Dependencies.length; dep_i++) {
				dep = Dependencies[dep_i];
				if ($("input[column='"+column+"']").filter("#"+dep.Service_uid).prop("checked")){
					continue; // skip if checked already
				}
				dep_services.push(dep);
				dep_titles.push(dep.Service);
			}

			if (dep_services.length > 0) {
				if(!modified_cols[column]){
					modified_cols.push(column);
				}
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
			if (Dependants.length > 0){
				for (i=0; i<Dependants.length; i++){
					dep = Dependants[i];
					cb = $("input[column='"+column+"']").filter("#"+dep.Service_uid);
					if (cb.prop("checked")){
						dep_titles.push(dep.Service);
						dep_services.push(dep);
					}
				}
				if(dep_services.length > 0){
					if (auto_yes) {
						for(dep_i=0; dep_i<dep_services.length; dep_i+=1) {
							dep = dep_services[dep_i];
							service_uid = dep.Service_uid;
							cb = $("input[column='"+column+"']").filter("#"+service_uid);
							$(cb).prop("checked", false);
							$(".partnr_"+service_uid).filter("[column='"+column+"']").empty();
							if ($(cb).val() == $("#getDryMatterService").val()) {
								$("#ar_"+column+"_ReportDryMatter").prop("checked",false);
							}
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
								Yes: function(){
									for(dep_i=0; dep_i<dep_services.length; dep_i+=1) {
										dep = dep_services[dep_i];
										service_uid = dep.Service_uid;
										cb = $("input[column='"+column+"']").filter("#"+service_uid);
										$(cb).prop("checked", false);
										$(".partnr_"+service_uid).filter("[column='"+column+"']").empty();
										if ($(cb).val() == $("#getDryMatterService").val()) {
											$("#ar_"+column+"_ReportDryMatter").prop("checked",false);
										}
									}
									$(this).dialog("close");
									$("#messagebox").remove();
								},
								No:function(){
									$(element).prop("checked",true);
									$(this).dialog("close");
									$("#messagebox").remove();
								}
							}
						});
					}
				}
			}
		}
		recalc_prices();
		for(var i=0; i<modified_cols.length; i+=1){
			calculate_parts(modified_cols[i]);
		}
	}
}

function calc_parts_handler(column, data){
        // Set new part numbers in hidden form field
        var formparts = $.parseJSON($("#parts").val());
        var parts = data.parts;
        formparts[column] = parts;
        $("#parts").val($.toJSON(formparts));
        // write new part numbers next to checkboxes
        for(var p in parts) { if(!parts.hasOwnProperty(p)){ continue; }
                for (var s in parts[p].services) {
                        if (!parts[p].services.hasOwnProperty(s)) { continue; }
                        $(".partnr_"+parts[p].services[s]).filter("[column='"+column+"']").empty().append(p+1);
                }
        }
}

function calculate_parts(column) {
        // Template columns are not calculated
        if ($("#ar_"+column+"_Template").val()){
                return;
        }
        var st_title = $("#ar_"+column+"_SampleType").val();
        sampletype = window.bika_utils.data.st_uids[st_title];
        st_uid = sampletype.uid;

        var checked = $("[name^='ar\\."+column+"\\.Analyses']").filter(":checked");
        var service_uids = [];
        for(var i=0;i<checked.length;i++){
                var uid = $(checked[i]).attr("value");
                service_uids.push(uid);
        }
        // if no sampletype or no selected analyses: remove partition markers
        if (st_uid === "" || service_uids.length === 0) {
                $("[class*='partnr_']").filter("[column='"+column+"']").empty();
                return;
        }
        var request_data = {
                        services: service_uids.join(","),
                        sampletype: st_uid,
                        _authenticator: $("input[name='_authenticator']").val()
        };
        window.jsonapi_cache = window.jsonapi_cache || {};
        var cacheKey = $.param(request_data);
        if (typeof window.jsonapi_cache[cacheKey] === "undefined") {
                $.ajax({
                        type: "POST",
                        dataType: "json",
                        url: window.portal_url + "/@@API/calculate_partitions",
                        data: request_data,
                        success: function(data) {
                                window.jsonapi_cache[cacheKey] = data;
                                calc_parts_handler(column, data);
                        }
                });
        } else {
                var data = window.jsonapi_cache[cacheKey];
                calc_parts_handler(column, data);
        }
}

function uncheck_partnrs(column){
	// all unchecked services have their part numbers removed
	ep = $("[class^='partnr_']").filter("[column='"+column+"']").not(":empty");
	for(i=0;i<ep.length;i++){
		em = ep[i];
		uid = $(ep[0]).attr('class').split("_")[1]
		cb = $("#"+uid);
		if ( ! $(cb).prop('checked') ){
			$(em).empty();
		}
	}
}

function unsetARTemplate(column){
	if($("#ar_"+column+"_ARTemplate").val() != ""){
		$("#ar_"+column+"_ARTemplate").val("");
	}
}

function unsetAnalysisProfile(column){
	if($("#ar_"+column+"_AnalysisProfile").val() != ""){
		$("#ar_"+column+"_AnalysisProfile").val("");
	}
}

function unsetAnalyses(column){
	$.each($('input[name^="ar.'+column+'.Analyses"]'), function(){
		$(this).prop('checked', false);
		$(".partnr_"+this.id).filter("[column='"+column+"']")
			.empty();
	});
}


function setARTemplate(){
	templateUID = $(this).val();
	column = $(this).attr("column");
	if(templateUID == "") return;

	template_data = $.parseJSON($("#template_data").val())[templateUID];
	analyses = template_data['Analyses'];

	// always remove DryMatter - the Template can put it back.
	$("#ar_"+column+"_ReportDryMatter").prop('checked', false);

	// set our template fields
	// SampleType and SamplePoint are strings - the item's Title.
	unsetAnalyses(column);
	st = template_data['SampleType'];
	$('#ar_'+column+'_SampleType').val(st);
	sp = template_data['SamplePoint'];
	$('#ar_'+column+'_SamplePoint').val(sp);
	dm = template_data['ReportDryMatter'];
	if(dm) {
		$('#ar_'+column+'_ReportDryMatter').prop('checked', true);
	}
	$('#ar_'+column+'_AnalysisProfile').val(template_data['AnalysisProfile']);

	// Apply Template analyses/parts
	parts = []; // #parts[column] will contain this dictionary
	for(pi=0;pi<template_data['Partitions'].length;pi++){
		P = template_data['Partitions'][pi];
		partnr = parseInt(P['part_id'].split("-")[1], 10);
		cu = P['container_uid'];
		if(cu != null && cu != undefined && cu.length > 1 && cu[0] != ""){ cu = [cu]; }
		else { cu = []; }
		pu = P['preservation_uid'];
		if(pu != null && pu != undefined && pu.length > 1 && pu[0] != ""){
			pu = [pu];
		}
		else {
			pu = [];
		}
		parts[partnr-1] = {'container':cu,
							'preservation':pu,
							'services':[]}
	}

	template_services = {};
	template_parts = {};
	analyses = template_data['Analyses'];
	for(i=0;i<analyses.length;i++){
		key = analyses[i]['service_poc'] + "_" + analyses[i]['category_uid'];
		if (template_services[key] == undefined){
			template_services[key] = [];
		}
		service_uid = analyses[i]['service_uid'];
		template_services[key].push(service_uid);
		template_parts[service_uid] = analyses[i]['partition'];
	}

	$.each(template_services, function(poc_categoryUID, selectedservices){
		if( $("tbody[class*='expanded']").filter("#"+poc_categoryUID).length > 0 ){
			$.each(selectedservices, function(i,uid){
				$.each($("input[column='"+column+"']").filter("#"+uid), function(x, e){
					$(e).prop('checked', true);
					partnr = template_parts[uid].split("-")[1];
					$(".partnr_"+uid).filter("[column='"+column+"']")
						.empty().append(partnr);
					partnr = parseInt(partnr,10);
					parts[partnr-1]['services'].push(uid);
				});
			});
		} else {
			p_c = poc_categoryUID.split("_");
			jQuery.ajaxSetup({async:false});
			toggleCat(p_c[0], p_c[1], column, selectedservices);
			jQuery.ajaxSetup({async:true});
			$.each(selectedservices, function(i,uid){
				partnr = template_parts[uid].split("-")[1];
				$(".partnr_"+uid).filter("[column='"+column+"']")
					.empty().append(partnr);
				partnr = parseInt(partnr,10);
				parts[partnr-1]['services'].push(uid);
			});
		}
	});

	// Set new part numbers in hidden form field
	formparts = $.parseJSON($("#parts").val());
	formparts[column] = parts
	$("#parts").val($.toJSON(formparts));

	recalc_prices(column);
}

function setAnalysisProfile(column){
	profileUID = $("#ar_"+column+"_AnalysisProfile").val();
	if(profileUID == "") return;
	unsetAnalyses(column);

	profile_data = $.parseJSON($("#profile_data").val())[profileUID];
	profile_services = profile_data['Services'];

	// always remove DryMatter - the Template can put it back.
	$("#ar_"+column+"_ReportDryMatter").prop('checked', false);

	$.each(profile_services, function(poc_categoryUID, selectedservices){
		if( $("tbody[class*='expanded']").filter("#"+poc_categoryUID).length > 0 ){
			$.each(selectedservices, function(i,uid){
				$.each($("input[column='"+column+"']").filter("#"+uid), function(x, e){
					$(e).prop('checked', true);
				});
				recalc_prices(column);
			});
		} else {
			p_c = poc_categoryUID.split("_");
			jQuery.ajaxSetup({async:false});
			toggleCat(p_c[0], p_c[1], column, selectedservices);
			jQuery.ajaxSetup({async:true});
		}
	});

	calculate_parts(column);
}

function service_checkbox_change(){
	var column = $(this).attr("column");
	var element = $(this);
	unsetAnalysisProfile(column);
	unsetARTemplate(column);

	// Unselecting Dry Matter Service unsets 'Report Dry Matter'
	if ($(this).val() == $("#getDryMatterService").val()
	    && $(this).prop('checked') == false) {
		$("#ar_"+column+"_ReportDryMatter").prop('checked', false);
	}

	// unselecting service: remove part number.
	if (!$(this).prop('checked')){
		$(".partnr_"+this.id).filter("[column='"+column+"']")
			.empty();
	}

	calcdependencies([element]);
	recalc_prices();
	calculate_parts(column);
};

function setupAutoCompleters(){
	//Sample Type and SamplePoint autocompleters are strange things.

	// .change() is triggered when the dropdown is rendered, and also when
	//           an item from the dropdown is selected.
	// .focus() is used to set window._ac_focus to 'this', for passing
	//          extra ajax values in $.autocomplete 'success' handler.

	// $.autocomplete must be called on each individual element in ar_add.
	for (col=0; col<parseInt($("#col_count").val()); col++) {

		$("#ar_"+col+"_SamplePoint").autocomplete({
			minLength: 0,
			source: function(request,callback){
				$.getJSON('ajax_samplepoints',
					{'term':request.term,
					 'sampletype':$("#ar_"+window._ac_focus.id.split("_")[1]+"_SampleType").val(),
					 '_authenticator': $('input[name="_authenticator"]').val()},
					function(data,textStatus){
						callback(data);
					}
				);
			}
		});
		$("#ar_"+col+"_SampleType").autocomplete({
			minLength: 0,
			source: function(request,callback){
				$.getJSON('ajax_sampletypes',
					{'term':request.term,
					 'samplepoint':$("#ar_"+window._ac_focus.id.split("_")[1]+"_SamplePoint").val(),
					 '_authenticator': $('input[name="_authenticator"]').val()},
					function(data,textStatus){
						callback(data);
					}
				);
			}
		});
	}

	function set_st(e){
		col = e.id.split("_")[1];
		st_uids = window.bika_utils.data.st_uids;
		match = false;
		$.each(st_uids, function(title, obj){
			if (match != false) { return; }
			if (title.toLowerCase() == $(e).val().toLowerCase()){
				$(e).val(title);
				unsetARTemplate(col);
				calculate_parts(col);
				st = window.bika_utils.data.st_uids[title];
				if (st['samplepoints'].length == 1) {
					$("#ar_"+col+"_SamplePoint").val(st['samplepoints'][0]);
				}
				ct = st['containertype'];
				disabled = $(e).prop('disabled');
				if (ct != undefined && ct != null
				    && (disabled == null || disabled == undefined)) {
					$("#ar_"+col+"_DefaultContainerType").val(ct);
				}
				match = true;
			}
		});
	}

	function set_sp(e){
		col = e.id.split("_")[1];
		sp_uids = window.bika_utils.data.sp_uids;
		match = false;
		$.each(sp_uids, function(title, obj){
			if (match != false) { return; }
			if (title.toLowerCase() == $(e).val().toLowerCase()){
				$(e).val(title);
				unsetARTemplate(col);
				sp = window.bika_utils.data.sp_uids[title];
				if (sp['sampletypes'].length == 1) {
					$("#ar_"+col+"_SampleType").val(sp['sampletypes'][0]);
					calculate_parts(col);
				}
				if(sp['composite']) {
					$("#ar_"+col+"_Composite").prop('checked', true);
				}
				match = true;
			}
		});
	}

	$(".sampletype").focus(function(){
		//console.log('st focus ' + $(this).val());
		window._ac_focus = this;
	});
	// also set on .change() though because sometimes we set these manually.
	$(".sampletype").change( function(){
		//console.log('st change ' + $(this).val());
		column = this.id.split("_")[1];
		st_title = $("#ar_"+column+"_SampleType").val();
		st_uid = window.bika_utils.data.st_uids[st_title];
		if (st_uid != undefined && st_uid != null){
			set_st(this);
		} else {
			uncheck_partnrs(column);
			$(this).val('');
			return;
		}
	});
  	$(".sampletype").blur(function(){
		//console.log('st blur ' + $(this).val());
		column = this.id.split("_")[1];
		st_title = $("#ar_"+column+"_SampleType").val();
		st_uid = window.bika_utils.data.st_uids[st_title];
		if (st_uid != undefined && st_uid != null){
			set_st(this);
		} else {
			uncheck_partnrs(column);
			$(this).val('');
			return;
		}
	});

	$(".samplepoint").focus(function(){
		//console.log('sp focus ' + $(this).val());
		window._ac_focus = this;
	});
	$(".samplepoint").change(function(){
		//console.log('sp change ' + $(this).val());
		set_sp(this);
	});
	$(".samplepoint").blur(function(){
		//console.log('sp blur ' + $(this).val());
		set_sp(this);
	});

}

function clickAnalysisCategory(){
	toggleCat($(this).attr("poc"), $(this).attr("cat")); // cat is a category uid
	if($(this).hasClass('expanded')){
		$(this).addClass('collapsed');
		$(this).removeClass('expanded');
	} else {
		$(this).removeClass('collapsed');
		$(this).addClass('expanded');
	}
}

$(document).ready(function(){

	_ = jarn.i18n.MessageFactory('bika');
	PMF = jarn.i18n.MessageFactory('plone');

	var curDate = new Date();
	var y = curDate.getFullYear();
	var limitString = '1900:' + y;
	var dateFormat = _("date_format_short_datepicker");

	// Sampling Date field is readonly to prevent invalid data entry, so
	// clicking SamplingDate field clears existing values.
	// clear date widget values if the page is reloaded.
	e = $('input[id$="_SamplingDate"]');
	if(e.length > 0){
		if($($(e).parents('form').children('[name="came_from"]')).val() == 'add'){
			$(e)
			.datepicker({
				showOn:'focus',
				showAnim:'',
				changeMonth:true,
				changeYear:true,
				dateFormat: dateFormat,
				yearRange: limitString
			})
			.click(function(){$(this).attr('value', '');})
		} else {
			$(e)
			.datepicker({
				showOn:'focus',
				showAnim:'',
				changeMonth:true,
				changeYear:true,
				dateFormat: dateFormat,
				yearRange: limitString
			})
		}
	}

	setupAutoCompleters();

	$("select[class='ARTemplate']").change(setARTemplate);

	$("select[class='AnalysisProfile']").change(function(){
		column = $(this).attr("column");
		unsetARTemplate(column);
		setAnalysisProfile(column);
		calculate_parts(column);
	});

	$(".copyButton").live('click',  copyButton );

	$('th[class^="analysiscategory"]').click(clickAnalysisCategory);

	$("#primary_contact").live('change', changePrimaryContact );

	$("input[name^='Price']").live('change', recalc_prices );

	$('#open_cc_browser').click(showSelectCC);
	$('input[id$="_SampleID_button"]').click(showSelectSample);

	$(".deleteSampleButton").click(deleteSampleButton);

	$(".ReportDryMatter").change(changeReportDryMatter);

    // AR Add/Edit ajax form submits
	ar_edit_form = $('#analysisrequest_edit_form');
	if (ar_edit_form.ajaxForm != undefined){
		var options = {
			url: window.location.href
				.split("?")[0]
				.replace("/ar_add","")
				.replace("/base_edit","")
				.replace("analysisrequests", "") + "/analysisrequest_submit",
			dataType: 'json',
			data: {'_authenticator': $('input[name="_authenticator"]').val()},
			beforeSubmit: function(formData, jqForm, options) {
				$("input[class~='context']").prop('disabled', true);
			},
			success: function(responseText, statusText, xhr, $form) {
				if(responseText['success'] != undefined){
					if(responseText['labels'] != undefined){
						destination = window.location.href
							.split("?")[0]
							.replace("/ar_add","")
							.replace("/analysisrequests", "")
							.replace("/base_edit", "");
						ars = responseText['labels'];
						labelsize = responseText['labelsize'];
						q = "/sticker?size="+labelsize+"&items=";
						q = q + ars.join(",");
						window.location.replace(destination+q);
					} else {
						destination = window.location.href
							.split("?")[0]
							.replace("/ar_add","")
							.replace("/analysisrequests","")
							.replace("/base_edit", "/base_view");
						window.location.replace(destination);
					}
				} else {
					msg = ""
					for(error in responseText['errors']){
						x = error.split(".");
						if (x.length == 2){
							e = x[1] + ", Column " + (+x[0]) + ": ";
						} else {
							e = "";
						}
						msg = msg + e + responseText['errors'][error] + "<br/>";
					};
					window.bika_utils.portalMessage(msg);
					window.scroll(0,0);
					$("input[class~='context']").prop('disabled', false);
				}
			},
			error: function(XMLHttpRequest, statusText, errorThrown) {
				window.bika_utils.portalMessage(statusText);
				window.scroll(0,0);
				$("input[class~='context']").prop('disabled', false);
			},
		};
		$('#analysisrequest_edit_form').ajaxForm(options);
	}

	// these go here so that popup windows can access them in our context
	window.recalc_prices = recalc_prices;
	window.calculate_parts = calculate_parts;
	window.toggleCat = toggleCat;

});
}(jQuery));
