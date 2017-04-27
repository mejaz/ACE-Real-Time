import os
import sys
import subprocess


def bcfiles(file1, file2, reportfile):
	
	cwd = os.getcwd()
	print cwd

	sys.path.insert(0, cwd)

	try:

		# subprocess.call(r"C:\Program Files (x86)\Beyond Compare 3\BCompare.exe /silent @ByndCmpResults\myscript.txt %s %s %s" % (file1, file2, reportfile))
		# bcresponse = subprocess.call(r"C:\Program Files (x86)\Beyond Compare 3\BCompare.exe /qc %s %s" % (file1, file2))

		subprocess.call(r"BCompare.exe /silent @ByndCmpResults\myscript.txt %s %s %s" % (file1, file2, reportfile))
		bcresponse = subprocess.call(r"BCompare.exe /qc %s %s" % (file1, file2))		
				

		print "subprocess complete"

		return bcresponse
	except Exception, e:

		print e
		return 1




