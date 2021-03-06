/** View **/

var radioButtonView = { 

	init : function() {
		this.render();
	},

	render : function() {
		var div1 = document.getElementsByClassName("rttdiv")[0];
		div1Child = div1.childNodes;
		var div2 = document.getElementsByClassName("websdiv")[0];
		div2Child = div2.childNodes;


		if (div1.style.display !== 'block') {
		
			div1.style.display = 'block';
			div1Child['radio']
			div2.style.display = 'none';
	
		} 

		else {

			div1.style.display = 'none';
			div2.style.display = 'block';
		}
	}
}

var pullDummyData = {

	init : function(txntype, txnname) {
		this.render(txntype, txnname)
	},

	render : function(txntype, txnname) {
		var reqxml = controller.getData(txntype, txnname);

		var dummyArea = document.getElementsByClassName('tarea2')[0];

		dummyArea.value = "";
		dummyArea.value = reqxml;
			
	}
}

var createAllRequests = {
	init : function() {

		var userData = controller.getUserData();
		
		var myxml = this.render(userData);

		return myxml;
	},

	render : function(val1) {
		var dummyArea = document.getElementsByClassName('tarea2')[0];

		if (val1 === "") {
			alert("Data not found!!");
			return;
		}

		var reqxml = dummyArea.value;
		var requestData = val1.split('\n');
		var headers = requestData[0].trim().split('\t');
		var alldata = [];

		for ( var i=1 ; i < requestData.length ; i++ ) {

			var tempuserdata = requestData[i].trim().split('\t');
			var xmldata = reqxml;
			
			for ( var j = 0; j < tempuserdata.length; j++) {

				xmldata = xmldata.replace('#' + String(headers[j]) + '#', tempuserdata[j].trim());
			}

			alldata.push(xmldata);
		}

		return alldata;
		
		
	}
}

var createUserRequestXMLs = {
	init : function(list1) {
		
		this.render(list1);

	},

	render : function(list1) {

		$('#noOfReq').text(list1.length + " request(s) created.");

		var allreqdiv = document.getElementsByClassName('allrequests')[0];
		allreqdiv.innerHTML = "";

		for (var i = 0; i < list1.length ; i++) {

			var txtardiv = document.createElement('div');
			txtardiv.className = "responseDiv";

			//creating and adding properties to label
			var txtarlabel = document.createElement('label');
			txtarlabel.className = "responseLabel";
			

			//adding properties to textarea
			var txtar = document.createElement('textarea');
			txtar.className = 'allrequeststxtbox';
			txtar.rows = '5';
			txtar.cols = '120';
			
			//label
			var labeltxt = document.createTextNode(i + 1);
			txtarlabel.appendChild(labeltxt);

			//textarea
			var txtartxt = document.createTextNode(list1[i]);
			txtar.appendChild(txtartxt);

			//Div
			txtardiv.appendChild(txtarlabel);
			txtardiv.appendChild(txtar);

			if (i%2 == 0) {
				txtardiv.className = "evenDiv";
			}
			else {
				txtardiv.className = "oddDiv";
			}

			//Parent Div

			allreqdiv.appendChild(txtardiv);
		}
	}
}




/** Model **/

var rttDict = {
	"270" : "<xml>#hello# - 270. Whats up #name#</xml>",
	"276" : "<xml>#hello# - 276. Whats up #name#</xml>",
	"278" : "<xml>#hello# - 278. Whats up #name#</xml>"
}

var websDict = {
	"rcc" : "<xml>#hello# - rcc. Whats up #name#</xml>",
	"scc" : "<xml>#hello# - scc. Whats up #name#</xml>"
}

var region_info = ""



/** Controller **/

var controller = {

	displayRadioButtons : function() {
		radioButtonView.init();
	},

	pasteDummyData : function(txntype, txnname) {
		pullDummyData.init(txntype, txnname);
	},

	getData : function(txntype, txnname) {
		if (txntype == 'rtt') {
			return rttDict[txnname];
		}

		if (txntype == 'webs') {
			return websDict[txnname];
		}
	},

	createrequests : function() {
		var finalxmls = createAllRequests.init();
		createUserRequestXMLs.init(finalxmls);
	},

	getUserData : function() {
		return (document.getElementsByClassName('tarea')[0].value).trim();
	},

	consolidateAllRequests : function() {

		var sourceDiv = document.getElementsByClassName("allrequests")[0];
		var allTextAr = sourceDiv.childNodes;

		temp = "";

		for (var t = 0; t < allTextAr.length; t++) {

			var subTxtAr = allTextAr[t].childNodes[1];

			temp += t+1;
			temp += "\n------\n"
			temp += subTxtAr.value;
			temp += "\n----------------------------------\n";
		}

		var $dialog = $("<textarea cols=65 rows=10></textarea>")
						.text(temp)
						.dialog({
							autoOpen : false,
							title : "All Requests",
							minWidth : 600,
							maxHeight : 500
						});

		
		$dialog.dialog('open');

	},

	runRequest : function() {
		
		var all_req_xmls = $('.allrequeststxtbox');

		for(var i=0; i < all_req_xmls.length; i++) {

			(function(i) {
				var txnReqXML = $(all_req_xmls[i]).val();
				// var pXML = $.parseXML(txnReqXML.replace(/\n/g, ""));

				var start_pos = txnReqXML.indexOf('ISA*');
				var end_pos = txnReqXML.indexOf('</generic:businessMessagePayload>');

				var myX12 = txnReqXML.substring(start_pos, end_pos);

				var selURL = $('#endpoint').val();
				var selTxn = $('#txn_dd').find('option:selected').text();
				var selRegion = $('#region_dd').find('option:selected').text();

				$.ajaxQueue({
					url: '/real/processX12/' + selRegion + '/' + selTxn,
					type: 'POST',
					data: JSON.stringify({'reqX12' : myX12, 'endpoint' : selURL}),
					contentType: 'application/json;charset=UTF-8',
					success: function(resp) {
							var response = $.parseJSON(resp);

							
							
							var x = parseInt(i) + 1;

							$.ajax({
								url: '/real/getLogs/' + selRegion + '/' + selTxn + '/' + response[1] + '/Y',
								type: 'GET',
								contentType: 'application/json;charset=UTF-8',
								success: function(logs_response) {
									
									var logsResponse = $.parseJSON(logs_response);
									logFilename = logsResponse[1].message;

									$('#allresp > table').append(
										"<tr>" + 
											"<td>"+ x +"</td>" + 
											"<td><textarea rows='6' cols='55' class='respTxtAr'>"+ response[0] +"</textarea></td>" + 
											"<td>"+ response[1] +"</td>" + 
											"<td>"+ response[2] +"</td>" + 
											"<td><a href='/goToLogFile/"+ selTxn + "/" + logFilename.split('\\\\')[2] + '/' + logFilename.replace(/^.*[\\\/]/, '') + "' target='_blank'>" + logFilename.replace(/^.*[\\\/]/, '') + "</a></td>" + 
										"</tr>"
									);
								},
								error: function(err_resp, errtext, errTh) {
									alert('Error :' + errtext + '-' + errTh);
								}
							});
							
						},
					error: function(err_resp, errtext, errTh) {
							alert('Error1 :' + errtext + '-' + errTh);
					}
				});
			})(i);
		};



	},

	ajax_callback: function(a) {


		return a[0];

	},

	ajax_callback2: function(x, resp1, resp2, repoFile, sts) {

		if (sts === 'NA') {

			$('#two-responses > table').append(
				"<tr>"+
					"<td>"+ x +"</td>"+
					"<td><textarea class='two-resp-text' cols='30' rows='8'>" + resp1 +"</textarea></td>"+
					"<td><textarea class='two-resp-text' cols='30' rows='8'>" + resp2 +"</textarea></td>"+
					"<td><a href='/bcfile/" + repoFile['filename'].split('\\\\')[1] + "/" + repoFile['filename'].split('\\\\')[2] + "/" + repoFile['filename'].replace(/^.*[\\\/]/, '') + "' target='_blank'>" + repoFile['filename'].replace(/^.*[\\\/]/, '') + "</a></td>"+
					"<td><span class='fail'>Fail</span></td>"+
				"</tr>"
			);	


		} else {

			$('#two-responses > table').append(
				"<tr>"+
					"<td>"+ x +"</td>"+
					"<td><textarea class='two-resp-text' cols='30' rows='8'>" + resp1 +"</textarea></td>"+
					"<td><textarea class='two-resp-text' cols='30' rows='8'>" + resp2 +"</textarea></td>"+
					"<td><a href='/bcfile/" + repoFile['filename'].split('\\\\')[1] + "/" + repoFile['filename'].split('\\\\')[2] + "/" + repoFile['filename'].replace(/^.*[\\\/]/, '') + "' target='_blank'>" + repoFile['filename'].replace(/^.*[\\\/]/, '') + "</a></td>"+
					"<td>"+ ((repoFile['result'] === 0 || repoFile['result'] === 12) ? "<span class='pass'>Pass</span>" : "<span class='fail'>Fail</span>") +"</td>"+
				"</tr>"
			);	
		};
		return 0
	},

	ajax_post_call: function(url, data, callback) {

		$.ajax({
			url: url,
			type: 'POST',
			cache: false,
			data: JSON.stringify(data),
			contentType: 'application/json;charset=UTF-8',
			success: callback, 
			error: function(errXqhr, errtext, errcode) {
				alert(errtext);
			}
		});
	},

	ajax_prepare_response: function(response) {
		return ['success', $.parseJSON(response)];
	}

}


/*Ajax load*/ 

$(document).on({
	ajaxStart: function() { 
		$('body').addClass('loading');
		
		// $('html, body').animate({
		// 	scrollTop : $('#ajax-load').offset().top
		// })
	},
	ajaxStop: function() { 

		$('body').removeClass('loading');
	}
});

/* txn change */

$(document).ready(function(){

	$('#baseReqArMultiple').hide();


	$('#txn_dd').on('change', function() {

		var reg = $(this).find('option:selected').text()

		$.ajax({
			url:'/real/getregions/' + String(reg),
			type: 'GET',
			datatype: 'JSON',
			success: function(resp) {
					region_info = $.parseJSON(resp);
					
					var reg_names = [];

					for( var i=0; i < region_info.length; i++) {
						reg_names.push('<option>' + region_info[i][0] + '</option>');
					}

					$('#region_dd > option').remove();
					$('#region_dd').append('<option value="">-- Choose One --</option>');
					$('#region_dd').append(reg_names);

				},
			error: function(err) {
				alert(err);
			}
			
		})

		$(this).find("option[value='']").remove();
	});


	$('#region_dd').on('change', function() {
		
		var sel_reg = $(this).find('option:selected').text();

		for(var i=0; i < region_info.length; i++) {
			
			if(sel_reg === region_info[i][0]) {
				
				$('#endpoint').val(region_info[i][1]);
				break;
			}
			
		}

		$(this).find('option[value=""]').remove();

	});

	$('.realToggle').on('click', function() {
		if($('.realTxns').is(':hidden')) {
			
			$('.realTxns').slideDown('slow');

		} else {
			
			$('.realTxns').slideUp();

		};	
	});



	$('#radioSel').find("input:radio[name='reqSelect']").on('change', function() {
		if($(this).val() === 'single') {
			$('#baseReqArMultiple').hide();
			$('#baseReqArSingle').show();
		} else {
			$('#baseReqArSingle').hide();
			$('#baseReqArMultiple').show();
		}
	});


	$('#upload-file-button').on('click', function() {

		var form_data = new FormData($('#upload_file')[0]);

		$.ajax({

			type: 'POST',
			url: '/real/uploadfile',
			data: form_data,
			processData: false,
			contentType: false,
			cache: false,
			success: function(resp) {
				var $resp = $.parseJSON(resp);
				$('#upload-file-button').next().text($resp.msg);
				$.ajax({
					type: 'GET',
					url: '/real/readFile/' + $resp['filename'],
					success: function(respX12s) {
						$resp = $.parseJSON(respX12s);
						var requestXMLs = $resp['data'];

						$('#baselineReq').children().remove();

						$('#noOfReqBaseline').text(requestXMLs.length + " request(s) loaded from the Excel sheet");

						for(var j=0; j < requestXMLs.length; j++) {
							$('#baselineReq').append(

								'<span>&nbsp;'+ (parseInt(j) + 1) + '&nbsp;</span>' +
								'<textarea class="allXMLs" cols="120" rows="5">'+
									requestXMLs[j] +
								'</textarea><br/><br/>'

							);
						}
					},
					error: function(resperr) {
						alert('error');
					}
				});
			},
			error: function(err) {
				var $err = $.parseJSON(err);
				$('#upload-file-button').next().text($err.msg);
			}

		});
	});

	$('#two-responses').on('click', '.folderOpen', function() {

		var val = $(this).val();
		console.log(val);

		$.ajax({
			url: '/real/bcreport/folderopen',
			type: 'POST',
			data: JSON.stringify({'path' : val}),
			contentType: 'application/json;charset=UTF-8',
			success: function(resp) {
				console.log(resp);
			},
			error: function(err) {
				console.log(err);
			}
		});

	});


	
	$('#runBaseline').on('click', function() {
		var baseRegion = $('#baseRegionSel').find('option:selected').text().trim();
		var curRegion = $('#curRegionSel').find('option:selected').text().trim();
		var curTxn = $('#baseTxnSel').find('option:selected').text().trim();

		var baseLineResptable = "<h3>Result:</h3><table>"+
											"<tr>"+
												"<th>S.No.</th>"+
												"<th>Baseline Response</th>"+
												"<th>Current Region Response</th>"+
												"<th>Compare Report</th>"+
												"<th>Result</th>"+
											"</tr>"+
										"</table>";

		$('#two-responses').children().remove();
		$('#two-responses').append(baseLineResptable);

		var $baseResponse = "";
		var $currResponse = "";		
		var datadict = "";
		var $m_resp_1 = "";
		var $m_resp_2 = "";
		var single_response_1 = "";
		var single_response_2 = "";
		var err1 = "";
		var err2 = "";

		if ($('#single').is(':checked')) {

			var singleReq = $('#baseReqArSingle > textarea').val();

			var start_pos = singleReq.indexOf('ISA*');
			var end_pos = singleReq.indexOf('</generic:businessMessagePayload>');
			var myX12 = singleReq.substring(start_pos, end_pos);


			// first request
			var url_1 = '/real/processX12/' + baseRegion + '/' + curTxn;
			var data_1 = {'reqX12' : myX12};

			controller.ajax_post_call(url_1, data_1, function(response) {
				single_response_1 = $.parseJSON(response);

				if (single_response_1[2].toLowerCase() != 'success') {

					err1 = single_response_1[2];

				};

				// second request
				var url_2 = '/real/processX12/' + curRegion + '/' + curTxn;
				var data_2 = {'reqX12' : myX12};			
					
				controller.ajax_post_call(url_2, data_2, function(response) {
					single_response_2 = $.parseJSON(response);

					if (single_response_2[2].toLowerCase() != 'success') {

						err2 = single_response_2[2];

					};

					// compare request
					var url_3 = '/real/baseline/compareresp';
					var data_3 = {'file1' : single_response_1[0].replace(/~/g, '~\n'), 'file2' : single_response_2[0].replace(/~/g, '~\n')};

					controller.ajax_post_call(url_3, data_3, function(response) {

						var $single_compare_response = $.parseJSON(response);

						// updating the table

						if (err1 != "" || err2 != "") {

							controller.ajax_callback2('1', (err1 === "" ? single_response_1[0].replace(/~/g, '~\n') : err1), (err2 === "" ? single_response_2[0].replace(/~/g, '~\n') : err2), $single_compare_response, 'NA');

						} else {

							controller.ajax_callback2('1', single_response_1[0].replace(/~/g, '~\n'), single_response_2[0].replace(/~/g, '~\n'), $single_compare_response, 'success');
						
						};

					});

				});


			});

		} else if ($('#multiple').is(':checked')) {

			var $all_req = $('#baselineReq > textarea');

			for(var y=0; y < $all_req.length; y++) {

				(function(y, $m_resp_1, $m_resp_2, err1, err2) {

					var x = parseInt(y) + 1;
					var tempReq = $($all_req[y]).val();

					var start_pos = tempReq.indexOf('ISA*');
					var end_pos = tempReq.indexOf('</generic:businessMessagePayload>');
					var myX12 = tempReq.substring(start_pos, end_pos);


					// first request
					var m_url_1 = '/real/processX12/' + baseRegion + '/' + curTxn;
					var m_data_1 = {'reqX12' : myX12};

					controller.ajax_post_call(m_url_1, m_data_1, function(response) {

						$m_resp_1 = $.parseJSON(response);

						if ($m_resp_1[2].toLowerCase() != 'success') {

							err1 = $m_resp_1[2];

						};						

						// second request
						var m_url_2 = '/real/processX12/' + curRegion + '/' + curTxn;
						var m_data_2 = {'reqX12' : myX12};

						controller.ajax_post_call(m_url_2, m_data_2, function(response) {

							$m_resp_2 = $.parseJSON(response);

							if ($m_resp_2[2].toLowerCase() != 'success') {

								err2 = $m_resp_2[2];

							};							

							// compare request
							var m_url_3 = '/real/baseline/compareresp';
							var m_data_3 = {'file1' : $m_resp_1[0].replace(/~/g, '~\n'), 'file2' : $m_resp_2[0].replace(/~/g, '~\n')};

							controller.ajax_post_call(m_url_3, m_data_3, function(response) {

								var $multiple_compare_response = $.parseJSON(response);

								// updating the table

								if (err1 != "" || err2 != "") {

									controller.ajax_callback2(x, (err1 === "" ? $m_resp_1[0].replace(/~/g, '~\n') : err1), (err2 === "" ? $m_resp_2[0].replace(/~/g, '~\n') : err2), $multiple_compare_response, 'NA');

								} else {

									controller.ajax_callback2(x, $m_resp_1[0].replace(/~/g, '~\n'), $m_resp_2[0].replace(/~/g, '~\n'), $multiple_compare_response);

								};

							});


						});

					});

				})(y, $m_resp_1, $m_resp_2, err1, err2);
			};
		};
	});

	$('#get-servers').on('click', function() {
		

		// var server = $('input:radio[name="server-sel"]:checked').val();
		var server_type = $('#svr_typ').find('option:selected').text()
		var server_region = $('#svr_rgn').find('option:selected').text()
		var server_port = $('#svr_port').find('option:selected').text()
		// var port = $('input:radio[name="port-sel"]:checked').val();

		var rows;

		$('#display-servers > table > tr').remove();
		$.ajax({
			url: '/real/allservers/getservers/' + server_type + '/' + server_region + '/' + server_port,
			type: 'GET',
			success: function(response) {
				var resp = $.parseJSON(response);
				var all_servers = resp['allservers'];

				$('#display-servers > table > tbody > tr:not(:first)').remove();

				for(var i = 0; i < all_servers.length; i++) {

					rows = 	"<tr><td><input class='checkit' type='checkbox'></td><td>" + (parseInt(i) + 1) + "</td>" + 
							"<td id='" + all_servers[i][1] + "'>" + server_region + "</td>" + 
							"<td>" + server_port + "</td>" + 
							"<td>" + all_servers[i][0] + "</td>" +
							"<td></td></tr>";
					$('#display-servers > table').append(rows);
				};

				$('#display-servers > table > tbody > tr:first').find('th > input[type="checkbox"]').click();

			},
			error: function() {
				alert('err');
			}
		});	


	});

	// check all checkboxes
	$('#display-servers').find('th > input[type="checkbox"]').on('change', function() {

		var $serverTable = $('#display-servers > table > tbody > tr:not(:first)');

		if($('#display-servers').find('th > input[type="checkbox"]').is(':checked')) {

			for(var x = 0; x < $serverTable.length; x++) {
				$($serverTable[x]).find('td > input[type="checkbox"]').eq(0).prop('checked', true);
			};

		} else {

			for(var x = 0; x < $serverTable.length; x++) {
				$($serverTable[x]).find('td > input[type="checkbox"]').eq(0).prop('checked', false);
			};

		}
	});	

	// uncheck header checkbox
	$('#display-servers').on('change', '.checkit', function() {
		if($(this).is(':checked')) {

			var $serverTable = $('#display-servers > table > tbody > tr:not(:first)');

			var k = 0;
			for (var i=0; i < $serverTable.length; i++) {

				if($($serverTable[i]).find('td > input[type="checkbox"]').eq(0).prop('checked') !== true ) {
					k += 1
				};
			}

			if (k===0) {
				$('#display-servers > table > tbody > tr:first').find('th > input[type="checkbox"]').prop('checked', true);
			};


		} else {
			
			$('#display-servers > table > tbody > tr:first').find('th > input[type="checkbox"]').prop('checked', false);

		};
	});

	// run requests
	$('#run-requests').on('click', function() {
		var $serverTable = $('#display-servers > table > tbody > tr:not(:first)');


		// user request
		if($('#all-servers-req').val() === '') {
			alert('request is empty!');
			return;
		}

		if($('#txn_dd').find('option:selected').val() === "") {
			alert('Select Transaction!');
			return;
		};

		var tempReq = $('#all-servers-req').val();

		// seleted transaction
		var txnName = $('#txn_dd').find('option:selected').text().trim();
		var server_type = $('#svr_typ').find('option:selected').text()
		var server_region = $('#svr_rgn').find('option:selected').text()
		var server_port = $('#svr_port').find('option:selected').text()		

		// extract X12 from the request XML

		if (tempReq.includes('</generic:businessMessagePayload>') && tempReq.includes('<generic:businessMessagePayload>')) {
			var start_pos = tempReq.indexOf('ISA*');
			var end_pos = tempReq.indexOf('</generic:businessMessagePayload>');
			var myX12 = tempReq.substring(start_pos, end_pos);

			console.log(myX12);

			

		} else {
			alert("'<generic:businessMessagePayload>' tag not found in the XML request!!");
			return;
		}

		// return;

		for(var i=0; i < $serverTable.length; i++) {
		// 	// console.log($($serverTable[i]).find('td').eq(3).text());

			(function(i) {

				//
				if ($($serverTable[i]).find('td').eq(0).find('input').is(':checked')) {
					console.log($($serverTable[i]).find('td').eq(1).text());
				

					// prepare the server endpoint and data object
					var alls_url = '/real/allservers/processX12/' + server_type + '/' + txnName;
					var ser_id = $($serverTable[i]).find('td').eq(2).attr('id');
					var alls_data = {'reqX12' : myX12, 'ser_id' : ser_id};

					// make an AJAX call
					controller.ajax_post_call(alls_url, alls_data, function(response) {
						var $response = $.parseJSON(response);

						$($serverTable[i]).find('td').eq(5).html('<div> <label>Return Code:</label>' + $response[2] + '</div><div><label>Return Code Description:</label>' + ($response[3] === 'success' ? "<span class='pass'>"+ $response[3] +"</span>" : "<span class='fail'>" + $response[3] + "</span>") + '</div><div><label>Tracking ID:</label>'+ $response[1] +'</div><div><label>Response Time : ' + $response[4] + ' ms</label></div><br /><div><label>Response X12:</label><textarea class="two-resp-text" cols="40" rows="8">'+ $response[0].replace(/~/g, '~\n') +'</textarea></div>');
					});

				};

			})(i);
		};
	});

	// Upload Regression Excel File
	$('#upload-real-reg').on('click', function() {

		var form_data = new FormData($('#upload_reg_file')[0]);

		$.ajax({

			type: 'POST',
			url: '/real/uploadfile',
			data: form_data,
			processData: false,
			contentType: false,
			cache: false,
			success: function(resp) {
				var $resp = $.parseJSON(resp);
				$('#upload-msg').text($resp['filename'] + " " + $resp['msg']);
				$.ajax({
					type: 'GET',
					url: '/real/regression/' + $resp['filename'],
					success: function(respTCs) {
						$resp = $.parseJSON(respTCs);

						if ($resp['name'] === 'TCs') {
							var requestTCs = $resp['data'];

							$('#all-reg-TCs').children().remove();

							$('#noOfTCs').text(requestTCs.length + " TCs loaded from the Excel sheet");

							$('#all-reg-TCs').append(

								"<table id='reg-tc-table'>"+
									"<tr>"+
										"<th>S.No.</th>"+
										"<th>Test Case</th>"+
										"<th>Trans Type</th>"+
										"<th>Request XML</th>"+
										"<th>Validate X12?</th>"+
										"<th>X12 Validation<br />(Expected Value)</th>"+
										"<th>Validate Logs?</th>"+
										"<th>Logs Validation<br />(Expected Value)</th>"+
										"<th>Response X12</th>"+
										"<th>Result</th>"+
									"</tr>"+
								"</table>" 
							);

							var temprow;

							for(var i=0; i < requestTCs.length; i++) {
								temprow = "";
								for(var j=0; j < requestTCs[i].length; j++) {

									if (j === 0){

										temprow += "<td>"+
														"<textarea cols='25' rows='3' readonly>" + requestTCs[i][j] + "</textarea>"
												    +"</td>";

									} else if (j === 1){

										temprow += "<td>"+
														"<span id='reg-rows' name='transType'>" + requestTCs[i][j] + "</span>"
												  +"</td>";

									} else if (j === 2) {	

										temprow += "<td>"+
														"<textarea cols='25' rows='3' name='xmlReq' readonly>" + requestTCs[i][j] + "</textarea>"
												    +"</td>";								

									} else if (j === 3) {									

										temprow += "<td>"+
														"<span id='reg-rows' name='xyn'>" + requestTCs[i][j] + "</span>"
												  +"</td>";
									
									} else if (j === 4) {									

										temprow += "<td>"+
														"<span id='reg-rows' name='xvald'>" + requestTCs[i][j] + "</span>"
												  +"</td>";

									} else if (j === 5) {									

										temprow += "<td>"+
														"<span id='reg-rows' name='lyn'>" + requestTCs[i][j] + "</span>"
												  +"</td>";

									} else if (j === 6) {									

										temprow += "<td>"+
														"<textarea cols='25' rows='3' id='reg-rows' name='lvald' readonly>" + requestTCs[i][j] + "</textarea>"
												  +"</td>"+
												  "<td>"+
														"<span id='reg-rows' name='resultX12'>Blank</span>"
												  +"</td>"+
												  "<td>"+
														"<div id='reg-rows' name='result' class='resultFinal'>Blank</div>"
												  +"</td>";
									}
									
								}
								console.log(temprow);
								$('#reg-tc-table tr:last').after("<tr><td>"+ (parseInt(i) + 1) + "</td>"+ temprow + "</tr>");
							}
						
							
						} else {
							$('#all-reg-TCs').children().remove();
							$('#noOfTCs').text($resp['msg']);
						}
					},
					error: function(resperr) {
						alert('error');
					}
				});
			},
			error: function(err) {
				alert('error');
			}

		});
	});


	// ajax queue request to the server
	$('#run-reg-tcs').on('click', function() {

		$('#reg-tc-table tr').not(':first').each(function() {

			var $this = $(this);
			var transType = $this.find('[name="transType"]').text();
			var xmlReq = $this.find('[name="xmlReq"]').text();
			var xyn = $this.find('[name="xyn"]').text();
			var lyn = $this.find('[name="lyn"]').text();
			var xvald = $this.find('[name="xvald"]').text();
			var lvald = $this.find('[name="lvald"]').text();
			var region = $('#reg-region').find('option:selected').text();
			var placeResult = $this.find('[name="result"]');
			var placeResultX12 = $this.find('[name="resultX12"]');

			// Extract X12
			var start_pos = xmlReq.indexOf('ISA*');
			var end_pos = xmlReq.indexOf('</generic:businessMessagePayload>');
			var regX12 = xmlReq.substring(start_pos, end_pos);			

			// data disctionary
			rowData = {'xvald' : xvald, 'lvald' : lvald , 'transType' : transType, 'regX12' : regX12, 'xyn' : xyn, 'lyn' : lyn, 'region' : region};

			console.log(rowData);

			$.ajaxQueue({
				url: '/real/regression',
				data: JSON.stringify(rowData),
				type: 'POST',
				contentType: 'application/json;charset=UTF-8',
				success: function(data) {
					var resp = $.parseJSON(data);
					var x12ValidationResult = resp['result'];
					// if (resp['result'] === 'Pass') {

					var resArr = resp['msg'];
					var tempresult = "";
					for(var i=0; i<resArr.length; i++) {

						// for (var key in resArr[i]) {
						// 	tempresult +="<li><span class='pass'>" + resArr[i][key][0] + "</span> -- <span>" + resArr[i][key][1] +"</span>" + "</li>";
						// }

						for (var key in resArr[i]) {

							if (resArr[i][key][0] === 'Pass') {
								tempresult +="<li><span class='pass'>" + resArr[i][key][0] + "</span> -- <span>" + resArr[i][key][1] +"</span>" + "</li>";
							} else {
								tempresult +="<li><span class='fail'>" + resArr[i][key][0] + "</span> -- <span>" + resArr[i][key][1] +"</span>" + "</li>";
							}
						}


					}	

					var presult = "<div> -- X12 Validaitons -- </div><div>Tracking Id : "+ resp['tckngId'] +"</div>"+
									"<div>Response Status : "+ resp['respCodeDesc'] +"</div>"+
									"<ol>"+ tempresult +"</ol>";


					var presX12 = "<textarea cols='20' rows='3' readonly>"+ resp['responseX12'] +"</textarea>";

					placeResult.html(presult);
					placeResultX12.html(presX12);

					// } else {

					// 	var resArr = resp['msg'];
					// 	var tempresult = "";
					// 	for(var i=0; i<resArr.length; i++) {

					// 		for (var key in resArr[i]) {

					// 			if (resArr[i][key][0] === 'Pass') {
					// 				tempresult +="<li><span class='pass'>" + resArr[i][key][0] + "</span> -- <span>" + resArr[i][key][1] +"</span>" + "</li>";
					// 			} else {
					// 				tempresult +="<li><span class='fail'>" + resArr[i][key][0] + "</span> -- <span>" + resArr[i][key][1] +"</span>" + "</li>";
					// 			}
					// 		}

					// 	}	

					// 	var fresult = "<div class='fail'>" + resp['result'] + "</div>"+
					// 					"<div> Tracking Id : "+ resp['tckngId'] +"</div>"+
					// 					"<div>Response Status : "+ resp['respCodeDesc'] +"</div>"+
					// 					"<ol>"+ tempresult +"</ol>";


					// 	var fresX12 = "<textarea cols='20' rows='3' readonly>"+ resp['responseX12'] +"</textarea>";

					// 	placeResult.html(fresult);
					// 	placeResultX12.html(fresX12);

					// }
					
					console.log(lyn.trim().toUpperCase());

					if (lyn.trim().toUpperCase() === 'YES') {
						// Get Logs
						$.ajax({
							url: '/real/getLogs/' + region + '/' + transType + '/' + resp['tckngId'] + '/Y',
							type: 'GET',
							contentType: 'application/json;charset=UTF-8',
							success: function(response) {

								response = $.parseJSON(response);

								RegLogFilename = response[1].message;
								console.log(RegLogFilename);
								logsLink = "<label>Logs:</label><a href='/goToLogFile/"+ transType + "/" + RegLogFilename.split('\\\\')[2] + '/' + RegLogFilename.replace(/^.*[\\\/]/, '') + "' target='_blank'>" + RegLogFilename.replace(/^.*[\\\/]/, '') + "</a>";

								placeResult.append('<div>-- Logs Results --</div>' + logsLink);

								$.ajax({
									url: '/logs/validate/' + transType + "/" + RegLogFilename.split('\\\\')[2] + '/' + RegLogFilename.replace(/^.*[\\\/]/, ''),
									type: 'POST',
									data: JSON.stringify({'lvald' : lvald}),
									contentType: 'application/json;charset=UTF-8',
									success: function(response) {
										var logValresp = $.parseJSON(response);
										var eachResp = "";

										// final log val result
										var logValidationResult = logValresp[0];
										var resp = logValresp[1];

										console.log(logValidationResult);
										console.log(resp);


										// iterating through each lvalds
										for (var key in resp) {

											var valresponse = "";
											var allmatches = "";

											valresponse += "<li>" + key + " : " + ((resp[key][0] === 'Found') ? "<span class='pass'>Found</span>" : "<span class='fail'>Not Found</span>");

											console.log(valresponse);

											// iterating through each match of the lvalds
											for (var i = 0; i < resp[key][1]['matches'].length; i++) {

												allmatches += "<li>" + resp[key][1]['matches'][i] + "</li>";

											}

											eachResp += valresponse + "<ul>" + allmatches + "</ul></li>";

										}

										// place the final logs validation result
										placeResult.append("<ol>" + eachResp + "</ol>");

										// Checking the final result

										if (x12ValidationResult === 'Pass' && logValidationResult === 'Pass') {
											placeResult.prepend("<div class='pass'>Pass</div>");
										} else {
											placeResult.prepend("<div class='fail'>Fail</div>");
										};

									},
									error: function(error) {
										alert(error);
									}
								});		

							},
							error: function(error) {
								alert('error');
							}
						});
					
					} else {

						placeResult.append('<div>-- Logs Validation is not required. --</div>');

					};


				}, 
				error: function(err1, err2, err3) {
					console.log(err1 + " " + err2 + " " + err3)
				}
			});

		});

	});

	// parse x12 to XML
	$('#parseXML').on('click', function() {
		var x12req = $('#X12req').val();

		$.ajax({
			url: '/real/x12ToXML',
			data: JSON.stringify({'req' : x12req}),
			type: 'POST',
			contentType: 'application/json;charset=UTF-8',		
			success: function(response) {
				var resp = $.parseJSON(response);

				$('#parsedXML').html("<textarea id='xmlparsed'  rows='15' cols='150' readonly>" + resp +  "</textarea>")
			},
			error: function(err) {
				alert("error");
			}
		})


	});

	// all servers svr button
	$('#svr_typ').on('change', function() {

		var svr = $(this).find('option:selected').text()

		$.ajax({
			url:'/real/getServerRegions/' + String(svr),
			type: 'GET',
			datatype: 'JSON',
			success: function(resp) {
					region_info = $.parseJSON(resp);
					
					var reg_names = [];

					for( var i=0; i < region_info.length; i++) {
						reg_names.push('<option>' + region_info[i][0] + '</option>');
					}

					$('#svr_rgn > option').remove();
					$('#svr_rgn').append('<option value="">-- Choose One --</option>');
					$('#svr_rgn').append(reg_names);

				},
			error: function(err) {
				alert(err);
			}
			
		})

		$(this).find("option[value='']").remove();
	});	

	// for ports
	$('#svr_rgn').on('change', function() {

		var svr_type = $('#svr_typ').find('option:selected').text()
		var rgn = $(this).find('option:selected').text()

		$.ajax({
			url:'/real/getServerPorts/' + String(svr_type) + '/' + String(rgn),
			type: 'GET',
			datatype: 'JSON',
			success: function(resp) {
					port_info = $.parseJSON(resp);
					
					var port_names = [];

					for( var i=0; i < port_info.length; i++) {
						port_names.push('<option>' + port_info[i][0] + '</option>');
					}

					$('#svr_port > option').remove();
					$('#svr_port').append(port_names);

				},
			error: function(err) {
				alert(err);
			}
			
		})

		$(this).find("option[value='']").remove();
	});

});

