// ar.js and sample.js are nearly identical
(function( $ ) {
"use strict";

function workflow_transition_sample(event){
	var PMF = window.jarn.i18n.MessageFactory("plone");
	event.preventDefault();
	if ($("#DateSampled").val() !== "" && $("#Sampler").val() !== "") {
		var requestdata = {};
		requestdata.workflow_action = "sample";
		$.each($("form[name='header_form']").find("input,select"), function(i,v){
			var name = $(v).attr("name");
			var value =  $(v).attr("type") == "checkbox" ? $(v).prop("checked") : $(v).val();
			requestdata[name] = value;
		});
		var requeststring = $.param(requestdata);
		// sending only the username, because it's all we have access to.
		var href = window.location.href.split("?")[0] + "?" + requeststring;
		window.location.href = href;
	} else {
		var message = "";
		if ($("#DateSampled").val() === ""){
			message = message + PMF("${name} is required, please correct.", {"name":"Date Sampled"});
		}
		if ($("#Sampler").val() === ""){
			if(message !== "") { message = message + "<br/>"; }
			message = message + PMF("${name} is required, please correct.", {"name":"Sampler"});
		}
		window.bika.lims.portalMessage(message);
	}
}

function workflow_transition_preserve(event){
	event.preventDefault();
	var _ = window.jarn.i18n.MessageFactory("bika");
	var message = _("You must preserve individual Sample Partitions");
	window.bika.lims.portalMessage(message);
}

function workflow_transition_publish(event){
	event.preventDefault();
	var requestdata = {};
	var spec_uid = $("#PublicationSpecification_uid").val();
	requestdata.PublicationSpecification = spec_uid;
	requestdata.workflow_action = "publish";
	var requeststring = $.param(requestdata);
	var href = window.location.href.split("?")[0]
		.replace("/base_view", "")
		.replace("/view", "") + "/workflow_action?" + requeststring;
	window.location.href = href;
}

function workflow_transition_republish(event){
	event.preventDefault();
	var requestdata = {};
	var spec_uid = $("#PublicationSpecification_uid").val();
	requestdata.PublicationSpecification = spec_uid;
	requestdata.workflow_action = "republish";
	var requeststring = $.param(requestdata);
	var href = window.location.href.split("?")[0]
		.replace("/base_view", "")
		.replace("/view", "") + "/workflow_action?" + requeststring;
	window.location.href = href;
}

function populate_sampletype(title) {
debugger;
	$.ajax({
		url: window.portal_url + "/getsampletypeinfo",
		type: 'POST',
		data: {'_authenticator': $('input[name="_authenticator"]').val(),
               'Title': title},
	    dataType: "json",
	    success: function(data, textStatus, $XHR){
	    	$('#SampleCategory').val(data['SampleCategoryTitle']);
	    }
	});
}

$(document).ready(function(){

	// var _ = window.jarn.i18n.MessageFactory("bika");
	// var PMF = window.jarn.i18n.MessageFactory("plone");

	// Plone "Sample" transition is only available when Sampler and DateSampled
	// are completed
	$("#workflow-transition-sample").click(workflow_transition_sample);

	$("#workflow-transition-publish").click(workflow_transition_publish);
	$("#workflow-transition-republish").click(workflow_transition_publish);

	// Disable Plone UI for preserve transition
	$("#workflow-transition-preserve").click(workflow_transition_preserve);

	function autocomplete_sampletype(request,callback){
		$.getJSON("ajax_sampletypes",
			{
				"term":request.term,
				"_authenticator": $("input[name='_authenticator']").val()
			},
			function(data){
				callback(data);
			}
		);
	}
	function autocomplete_samplepoint(request,callback){
		$.getJSON("ajax_samplepoints",
			{
				"term":request.term,
				"_authenticator": $("input[name='_authenticator']").val()
			},
			function(data){
				callback(data);
			}
		);
	}
	$("#SampleType").autocomplete({ minLength: 0, source: autocomplete_sampletype});
	$("#SamplePoint").autocomplete({ minLength: 0, source: autocomplete_samplepoint});

	// Update sample matrix when sample type changed in AnalysisRequestViewView
	// Must be only loaded in AnalysisRequestViewView:
	//  /clients/<client_id>/<ar_id>
	//  /clients/<client_id>/<ar_id>/base_view
	if (window.location.href.search('/clients/') >= 0) {
		clientid =  window.location.href.split('/clients/')[1].split('/')[0];
		arid = $(".documentFirstHeading").html();
		if (arid && window.location.href.search('/clients/'+clientid+'/'+arid)) {
			$("#SampleType").autocomplete({
		        select: function (event, ui) {
		        	populate_sampletype(ui.item.value);
		        }
		    });
			if ($("input[id='SampleCategory']")) {
				$("input[id='SampleCategory']").attr('readonly', true);
			}
		}
	}
	
});
}(jQuery));
