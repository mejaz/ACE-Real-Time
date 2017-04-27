import os
import subprocess
import requests
import ctypes
from time import sleep, time
from flask import Flask, render_template, url_for, request, send_from_directory, current_app,\
	jsonify
from werkzeug.utils import secure_filename
import json
import ibm_db
import pysftp
from xml.dom import minidom
from dblib import make_a_connection, getRecords, disconnect_database
from bsfunc import getLogs, getDateTime, writeToFile, get_X12s, get_TCs
from bcfunc import bcfiles
from x12funcs import x12ToXML, getSegmentValues, compareResponse


UPLOAD_FOLDER = 'uploaded_files'
ALLOWED_EXTENTIONS = set(['xlsx', 'xls'])

app = Flask(__name__)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/')
@app.route('/home')
def home():
	return render_template("home.html")

@app.route('/mywebservices/webservices')
def webservices():
	return render_template('webservices.html')


@app.route('/real')
def real():

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	try:
		
		txn_query = 'SELECT TRANS_NAME FROM TRANS_REAL;'

		all_real_trans = getRecords(CONN, txn_query).fetchall()

		

	except Exception, e:
		print (e)


	msg_disc = disconnect_database(CONN)
	print msg_disc

	return render_template("real.html", txns = all_real_trans)

@app.route('/batch')
def batch():
	return render_template("batch.html")


@app.route('/real/getregions/<string:txnName>', methods=['GET'])
def getregions(txnName):

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	try:
		
		txn_query = 'SELECT REGION, PAYLD_ENDPT FROM TRANS_REGION;'

		temp = getRecords(CONN, txn_query).fetchall()

		txn_region = json.dumps([list(row) for row in temp])
		
	except Exception, e:
		print(e)

	msg_disc = disconnect_database(CONN)
	print msg_disc		

	return txn_region


@app.route('/real/processX12/<string:region>/<string:txnName>', methods=['POST'])
def processX12(region, txnName):
	
	""" Process the X12 received by add to the Generic Payload request
			and return the processed X12 response, Tracking Id and 
				description """

	print region
	print txnName

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]		

	try:

		# Prepare the select query
		# txn_query_1 = "SELECT GENRIC_REQ FROM TRANS_REAL WHERE TRANS_NAME='%s';" % txnName
		query_regn_servr_type = "SELECT PAYLD_ENDPT, SERVER_TYPE FROM TRANS_REGION WHERE REGION='%s';" % region

		# Fetch records from the DB by running the query
		# db_records_1 = getRecords(CONN, txn_query_1).fetchall()
		db_regn_servr_type = getRecords(CONN, query_regn_servr_type).fetchall()

		# server type
		server_endpnt = db_regn_servr_type[0][0]
		server_type_name = db_regn_servr_type[0][1]

		print server_endpnt
		print server_type_name

		# get XML requests
		query_get_XML = "SELECT XML_REQUEST FROM GENERIC_REQUEST WHERE SERVER_TYPE = '%s';" % server_type_name
		dummy_XML_request = getRecords(CONN, query_get_XML).fetchall()

		# Update the Payload request with the request X12
		request_XML = str(dummy_XML_request[0][0]).replace('#Req_X12#', request.json['reqX12']).replace('#Req_Type#', txnName.strip())

		print request_XML	

		# Prepare the header for the webservice request
		headers = {'Content-Type': 'text/xml', 'charset': 'UTF-8', 'SOAPAction': ""}		

		
		# Update the Payload request with the request X12
		# request_XML = str(db_records_1[0][0]).replace('#Req_X12#', request.json['reqX12'])


		# make a POST request
		r = requests.post(server_endpnt, request_XML, headers=headers)


		# Parse the XML response
		xmldoc = minidom.parseString(r.text)


		# Prepare the response
		response = []
		response.append(xmldoc.getElementsByTagName('payload')[0].childNodes[0].data)
		response.append(xmldoc.getElementsByTagName('trackingId')[0].childNodes[0].data)
		response.append(xmldoc.getElementsByTagName('returnCodeDescription')[0].childNodes[0].data)

		print response
	except Exception, e:
		print(e)

	msg_disc = disconnect_database(CONN)
	print msg_disc	

	return json.dumps(response)


@app.route('/real/getLogs/<string:region>/<string:txnName>/<string:txnID>/<string:logsFlag>', methods=['GET'])
def sendLogs(region, txnName, txnID, logsFlag):

	""" returns logs file array object """

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	getUrl_query = "SELECT LOG_ENDPT FROM TRANS_REGION WHERE REGION = '%s';" % region
	getLogFilename_query = "SELECT LOG_FILE FROM TRANS_REAL WHERE TRANS_NAME = '%s';" % txnName

	logUrl = str(getRecords(CONN, getUrl_query).fetchall()[0][0])[1:-1]
	logFilename = getRecords(CONN, getLogFilename_query).fetchall()[0][0]

	msg_disc = disconnect_database(CONN)
	print msg_disc	

	print logUrl
	print logFilename

	all_filenames = str(logFilename).split(',')

	for filex in all_filenames:
		tempUrl = '%s?file=%s' % (logUrl, filex.strip())

		print tempUrl
		
		logsObj = getLogs(tempUrl, txnID)

		print "received logsObj"

		if logsObj != 1:

			if logsFlag == 'N':
				logsJSON = {'Logs' : '%s' % logsObj, 'filepath' : 'NA'}

				return json.dumps([{'item' : k, 'message' : v} for k, v in logsJSON.items()], indent=4)

			elif logsFlag == 'Y':

				print "in logs Flag Y"
				
				cur_dt_time = getDateTime()
				date_today = cur_dt_time[0]
				time_now = cur_dt_time[1]


				writeFile = writeToFile(foldername='logs', ObjLog=logsObj, txnName=txnName, dt=date_today, tm=time_now)

				print 'write done'

				if writeFile != 1:
					logsJSON = {'Logs' : '%s' % logsObj, 'filepath' : '%s' % writeFile}

					# return logsJSON
					return json.dumps([{'item' : k, 'message' : v} for k, v in logsJSON.items()], indent=4)

		else:

			print "logs object returned 1 from getLogs"



	errorJSON = {'Logs' : 'Error - Txn Id not found. Please check Region, TxnName and ID', 'filepath' : 'NA'}

	
	return json.dumps([{'item' : k, 'message' : v} for k, v in errorJSON.items()], indent=4)


@app.route('/real/baseline')
def realBaselineTest():

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	try:
		
		txn_query1 = 'SELECT REGION FROM TRANS_REGION;'
		txn_query2 = 'SELECT TRANS_NAME FROM TRANS_REAL;'

		temp = getRecords(CONN, txn_query1).fetchall()
		all_real_trans = getRecords(CONN, txn_query2).fetchall()
		

		txn_region = [list(row) for row in temp]
		all_txns = [list(row) for row in all_real_trans]
		
		
	except Exception, e:
		print(e)

	msg_disc = disconnect_database(CONN)
	print msg_disc	

	return render_template('realbaseline.html', regns = txn_region, txns=all_txns)

@app.route('/<string:selFolder>/<string:selTxn>/<string:fold>/<string:filename>', methods=['GET'])
def goToLogFile(selFolder, selTxn, fold, filename):

	
	if selFolder == 'goToLogFile':
		log_folder = os.path.join(current_app.root_path, 'logs')
		path = '%s\\%s\\%s' % (log_folder, selTxn, fold)

	elif selFolder == 'bcfile':

		# selTxn is the date folder name

		log_folder = os.path.join(current_app.root_path, 'ByndCmpResults')
		path = '%s\\%s\\%s' % (log_folder, selTxn, fold)
	

	return send_from_directory(directory=path, filename=filename)




@app.route('/real/uploadfile', methods=['POST'])
def uploadFile():

	if request.method == 'POST':

		if 'file' not in request.files:
			return json.dumps({'response' : 1, 'msg' : 'No File part'})

		myfile= request.files['file']

		if myfile.filename == '':
			
			return json.dumps({'response' : 1, 'msg' : 'No File selected'})

		myAllowedFile = myfile.filename.rsplit('.', 1)[1] in ALLOWED_EXTENTIONS

		if myfile and myAllowedFile:
			reqFilename = secure_filename(myfile.filename)
			try:
				
				myfile.save(os.path.join(app.config['UPLOAD_FOLDER'], reqFilename))
				return json.dumps({'response' : 0, 'msg' : 'File Uploaded', 'filename' : reqFilename})

			except Exception, e:

				print(e)
				return json.dumps({'response' : 1, 'msg' : e})

		else:
			return json.dumps({'response' : 1, 'msg' : 'File extension not allowed.'})

	else:
		return json.dumps({'response' : 1, 'msg' : 'Post request expected.'})


@app.route('/real/readFile/<string:filename>', methods=['GET'])
def readFile(filename):
	
	print '%s/%s' % (UPLOAD_FOLDER, filename)


	if os.path.exists('%s/%s' % (UPLOAD_FOLDER, filename)):

		allX12s = get_X12s('%s/%s' % (UPLOAD_FOLDER, filename))

		return json.dumps({'name' : 'XML', 'data' : allX12s})

	else:

		return json.dumps({'name' : 'XML', 'data' : "file does not exist"})


@app.route('/real/baseline/compareresp', methods=['POST'])
def compareFiles():

	cmpFiles = ""

	if request.method == 'POST':

		dt, tm = getDateTime()

		print "in compareFiles"


		file1_write = writeToFile(foldername=r"ByndCmpResults", ObjLog=request.json['file1'], dt=dt, tm=tm, filename="baseline")

		print "file1 written"
		

		file2_write = writeToFile(foldername=r"ByndCmpResults", ObjLog=request.json['file2'], dt=dt, tm=tm, filename="current")

		print "file2 written"

		report_filename = r'%s\\%s' % (file1_write.rsplit('\\', 1)[0], "bcreport.html")

		print report_filename

		if file1_write != 1 and file2_write != 1:

			cmpFiles = bcfiles(file1_write, file2_write, report_filename)

			print cmpFiles

			if cmpFiles != 1:
				print "Done"

			else:

				print "done with errors"


	return json.dumps({'result' : cmpFiles, 'filename' : report_filename})



@app.route('/real/bcreport/folderopen', methods=['POST'])
def folderOpen():


	lpath = request.json['path'].rsplit('\\\\\\', 1)[0]
	print lpath

	resp = ""
	try:
		subprocess.Popen(['explorer', r'%s' % lpath.replace('\\\\', '\\')])
		resp = 0
	except Exception, e:
		print e
		resp=e

	return resp


@app.route('/real/allservers', methods=['GET', 'POST'])
def all_servers():

	""" renders the all servers html page """

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	


	try:
		
		txn_query = 'SELECT TRANS_NAME FROM TRANS_REAL;'

		all_real_trans = getRecords(CONN, txn_query).fetchall()
		
	except Exception, e:
		print (e)

	msg_disc = disconnect_database(CONN)
	print msg_disc	

	return render_template('all_servers.html', txns = all_real_trans)


@app.route('/real/allservers/getservers/<string:server>/<string:port>', methods=['GET'])
def get_servers(server, port):

	""" returns all the servers with port specific number """

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]		

	txn_query_1 = "SELECT SERVER_ENDPOINT, SERVER_ID FROM SERVER_INFO WHERE SERVER_NAME=\'%s\' AND SERVER_PORT=\'%s\';" % (server, port)
	print txn_query_1

	temp_servers = getRecords(CONN, txn_query_1).fetchall()

	req_servers = [list(row) for row in temp_servers]

	msg_disc = disconnect_database(CONN)
	print msg_disc	

	return json.dumps({'allservers' : req_servers})



@app.route('/real/allservers/processX12/<string:txnName>', methods=['POST'])
def run_all_servers(txnName):

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	if request.method == 'POST':

		# try:

		print request.json['ser_id']
		# Prepare the select query
		query_server_id = "SELECT SERVER_ENDPOINT FROM SERVER_INFO WHERE SERVER_ID='%s';" % request.json['ser_id']
		# txn_query_2 = "SELECT GENRIC_REQ FROM TRANS_REAL WHERE TRANS_NAME='%s';" % txnName

		# get XML requests
		query_get_XML = "SELECT XML_REQUEST FROM GENERIC_REQUEST WHERE SERVER_TYPE = '%s';" % 'WAS'
		dummy_XML_request = getRecords(CONN, query_get_XML).fetchall()

		# Fetch records from the DB by running the query
		db_server_edpt = getRecords(CONN, query_server_id).fetchall()
		# db_records_2 = getRecords(CONN, txn_query_2).fetchall()
		
		
		# Update the Payload request with the request X12
		request_XML = str(dummy_XML_request[0][0]).replace('#Req_X12#', request.json['reqX12']).replace('#Req_Type#', txnName.strip())


		# Prepare the header for the webservice request
		headers = {'Content-Type': 'text/xml', 'charset': 'UTF-8', 'SOAPAction': ""}

		# make a POST request
		s = time()
		r = requests.post(db_server_edpt[0][0], request_XML, headers=headers)
		e = int(round((time() - s) * 1000))

		print e
		sleep(2)

		# Parse the XML response
		xmldoc = minidom.parseString(r.text)


		# Prepare the response
		response = []
		response.append(xmldoc.getElementsByTagName('payload')[0].childNodes[0].data)
		response.append(xmldoc.getElementsByTagName('trackingId')[0].childNodes[0].data)
		response.append(str(xmldoc.getElementsByTagName('returnCode')[0].childNodes[0].data))
		response.append(xmldoc.getElementsByTagName('returnCodeDescription')[0].childNodes[0].data)
		response.append(e)


		print response
		# except Exception, e:
			# print(e)


	msg_disc = disconnect_database(CONN)
	print msg_disc	

	return json.dumps(response)


@app.route('/real/regression', methods=['GET', 'POST'])
def regressionreal():

	# Connect to the Database
	CONN = make_a_connection('B2BACE.accdb')[0]	

	txn_query1 = 'SELECT REGION FROM TRANS_REGION;'
	temp_regions = getRecords(CONN, txn_query1).fetchall()
		
	txn_region = [list(row) for row in temp_regions]
	

	if request.method == 'POST':

		# Extract all the json reuest params
		xvald = request.json['xvald']
		transType = request.json['transType']
		regX12 = request.json['regX12']
		region = request.json['region']
		xyn = request.json['xyn']

		# prepare the select query
		# regn_query = "SELECT PAYLD_ENDPT FROM TRANS_REGION WHERE REGION='%s';" % region
		query_regn_servr_type = "SELECT PAYLD_ENDPT, SERVER_TYPE FROM TRANS_REGION WHERE REGION='%s';" % region
		
		# run queries
		db_regn_servr_type = getRecords(CONN, query_regn_servr_type).fetchall()

		# server type
		server_endpnt = db_regn_servr_type[0][0]
		server_type_name = db_regn_servr_type[0][1]

		print server_endpnt
		print server_type_name					

		# txn_query = "SELECT GENRIC_REQ FROM TRANS_REAL WHERE TRANS_NAME='%s';" % transType
		# get XML requests
		query_get_XML = "SELECT XML_REQUEST FROM GENERIC_REQUEST WHERE SERVER_TYPE = '%s';" % server_type_name
		dummy_XML_request = getRecords(CONN, query_get_XML).fetchall()		


		# run queries
		# endpnt = getRecords(CONN, regn_query).fetchall()
		# txnReq = getRecords(CONN, txn_query).fetchall()

		# replace and prepare XML request
		# request_XML = str(txnReq[0][0]).replace('#Req_X12#', request.json['regX12'])
		# Update the Payload request with the request X12
		request_XML = str(dummy_XML_request[0][0]).replace('#Req_X12#', regX12).replace('#Req_Type#', transType.strip())
		print request_XML			

		# Prepare the header for the webservice request
		headers = {'Content-Type': 'text/xml', 'charset': 'UTF-8', 'SOAPAction': ""}

		# print endpnt[0][0]
		# print request_XML

		msg_disc = disconnect_database(CONN)
		print msg_disc			

		# make a POST request
		r = requests.post(server_endpnt, request_XML, headers=headers)


		xmldoc = minidom.parseString(r.text)
		x12resp = xmldoc.getElementsByTagName('payload')[0].childNodes[0].data
		tckngId = xmldoc.getElementsByTagName('trackingId')[0].childNodes[0].data
		respCodeDesc = xmldoc.getElementsByTagName('returnCodeDescription')[0].childNodes[0].data
		print respCodeDesc

		# expected XML response status
		# expresp, loopvalds = xvald.split('\n')
		expresp, allLoopvalds = xvald.split('\n', 1)

		# expected output
		# loop, seg, segval = loopvalds.split('|')

		xmlFinalResultArr = []

		# proceed if user checks for success
		if expresp.strip().upper() == 'SUCCESS':
		
			# proceed if response is success
			if respCodeDesc.strip().upper() == 'SUCCESS':
			
				# convert X12 to XML
				xmlresponse = x12ToXML(x12resp)
				print xmlresponse

				# to capture responses for each segment validation
				xmlResponseSegmentsArr = []
				
				allLoopvaldsArr = allLoopvalds.split("\n")

				for x in allLoopvaldsArr:

					print x

					temploop, tempseg, tempval = x.split("|")

					# get segment values
					tempXmlResponseSegments = getSegmentValues(xmlresponse.strip(), temploop.strip(), tempseg.strip())
					print tempXmlResponseSegments

					xmlResponseSegmentsArr.append(tempXmlResponseSegments)

					# checking if the success key exists in the dictionary
					if 'success' in tempXmlResponseSegments:

						# compare and get the result
						tempRespResult = compareResponse(tempXmlResponseSegments['success'], tempval.strip(), temploop.strip())

						if tempRespResult['result'] == 'Pass':

							print tempRespResult['msg']

							xmlFinalResultArr.append({'Pass' : ['Pass', tempRespResult['msg']]})
							
							# return json.dumps()
						
						else:

							print tempRespResult['msg']

							xmlFinalResultArr.append({'Fail' : ['Fail', tempRespResult['msg']]})
							# return json.dumps


					elif 'error' in tempXmlResponseSegments:

						print tempXmlResponseSegments['error']

						xmlFinalResultArr.append({'Fail' : ['Fail', tempXmlResponseSegments['error']]})
						# return json.dumps

			else:

				xmlFinalResultArr.append({'Fail' : ['Fail', respCodeDesc]})
				# return json.dumps(xmlFinalResultArr)

		# To do error scenarios
		elif expresp.upper() == 'ERROR':
			
			if respCodeDesc.upper() == 'ERROR':

				pass


		print xmlFinalResultArr


		# return response
		for x in xmlFinalResultArr:
			if 'Fail' in x:
				print "inside"
				return json.dumps({'result' : 'Fail', 'msg' : xmlFinalResultArr, 'responseX12' : x12resp})


		return json.dumps({'result' : 'Pass', 'msg' : xmlFinalResultArr, 'responseX12' : x12resp})

	msg_disc = disconnect_database(CONN)
	print msg_disc		

	return render_template("regressionreal.html", regions=txn_region)



@app.route('/real/regression/<string:filename>', methods=['GET'])
def readRegressionFile(filename):
	
	print '%s/%s' % (UPLOAD_FOLDER, filename)


	if os.path.exists('%s/%s' % (UPLOAD_FOLDER, filename)):

		
		allTCs = get_TCs('%s/%s' % (UPLOAD_FOLDER, filename))

		if allTCs[0] == 1:
			return json.dumps({'name' : 'error', 'msg' : "Sheet 'TestCases' does not exist in the Excel sheet."})

		return json.dumps({'name' : 'TCs', 'data' : allTCs[1]})

	else:

		return json.dumps({'name' : 'error', 'msg' : "file does not exist"})


@app.route('/real/x12ToXML', methods=['GET', 'POST'])
def x12ToparsedXML():

	if request.method == 'POST':
		x12req = request.json['req'].strip()

		respXML = x12ToXML(x12req)

		return json.dumps(respXML)

	return render_template('x12ToXML.html')

if __name__ == '__main__':
	app.debug = True
	app.run(host='0.0.0.0', port=5000, threaded=True)