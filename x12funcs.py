import clr

def x12ToXML(x12Str):
	""" Returns an XML as a String. Receives X12 as a String. """

	# adding dll to the clr
	clr.AddReference("Optum.X12")

	# importing class from the dll
	from Optum.X12.Parsing import X12Parser

	# creating an object
	xpar = X12Parser()

	# parsing the x12 string
	xmlObj = xpar.ParseMultiple(x12Str)
	xmlStr = []

	# iterating over the parsed X12
	for x in xmlObj:
		x.SerializeToX12(True)
		xmlStr.append(x.Serialize())


	# returns XML string
	return xmlStr[0]

def getSegmentValues(xmlStr, loopID, segment):
	""" returns the segment value """

	# importing minidom module
	from xml.dom import minidom

	# parsing the xml string
	xmldoc = minidom.parseString(xmlStr)

	# extracting all the tags with name Loop
	allLoops = xmldoc.getElementsByTagName('Loop')

	# all loops  with the user provided loopID
	allUserLoops = []

	for loop in allLoops:
		if loop.getAttribute("LoopId") == loopID:
			allUserLoops.append(loop)

	# if the user provided loop is not found
	if len(allUserLoops) == 0:
		return {'error' : "Loop %s not found." % loopID}

	# a dictionary which will contain the segment values
	# corresponding to each loop.

	allSegmntDict = {}			

	for x in xrange(len(allUserLoops)):
		if allUserLoops[x].getElementsByTagName(segment):
			allSegmntDict[x + 1] = allUserLoops[x].getElementsByTagName(segment)[0].childNodes[0].data

	# if user provided segment is not found
	if not bool(allSegmntDict):
		return {'error' : "Segment %s not found in loop %s." % (segment, loopID)}


	return {'success' : allSegmntDict}


def compareResponse(responseDict, actual, loop):
	""" Compares the expected and actual values and returns passed or failed """

	count = 0

	for k, v in responseDict.items():
		
		if v == actual:

			count += 1


	if count > 0:

		return {'result' : 'Pass', 'msg' : 'Segment Value "%s" found "%s" time(s) in the X12 response loops "%s"' % (actual, count, loop)}

	else:

		return {'result' : 'Fail', 'msg' : 'Segment Value "%s" found "%s" time(s) in the X12 response loops "%s"' % (actual, count, loop)}

# with open(r"C:\Users\msiddiq1\Documents\Test-Python\Project-X12-Parse\N_270B_BS321GRACEZI_000000003.txt", 'r') as f:
# 	r = f.read()

# xmlString = x12ToXML(r)

# print getSegmentValues(xmlString, "2110C", "NM103")