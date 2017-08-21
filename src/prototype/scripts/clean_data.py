from pyzipcode import ZipCodeDatabase
import csv
def addGeo():
	geos = []
	zcdb = ZipCodeDatabase()
	file = open("../data/2010_Census_Populations_Geo.csv")
	for line in file.readlines():
		line_arr = line[:-1].split(",")
		zipcode_str = line_arr[0]
		try:
			zipcode = zcdb[zipcode_str]
			print round(zipcode.latitude, 4), round(zipcode.longitude, 4)
		except IOError:
			print "Error"
		else:
			print "else"
			# geos.append([zipcode_str, line_arr[1], line_arr[2], line_arr[3], line_arr[4], line_arr[5], line_arr[6], round(zipcode.latitude, 4), round(zipcode.longitude, 4)])

	# with open('../data/2010_Census_Populations_Geo.csv', 'wb') as csvfile:
	#     spamwriter = csv.writer(csvfile, delimiter=',')
	#     for geo in geos:
	#     	print geo
	#     	spamwriter.writerow(geo)


standard = [
	[34.957, -116.598, 33.138, -119.894],
	[34.507, -117.419, 33.596, -119.067], 
	[34.280, -117.831, 33.825, -118.655], 
	[34.166, -118.038, 33.938, -118.450], [34.109, -118.140, 33.995, -118.347],[34.081, -118.192, 34.024, -118.295], [34.066, -118.218, 34.038, -118.269],
	[34.059, -118.230, 34.045, -118.257]]
def addZoom():
	geos = []
	file = open("../data/2010_Census_Populations_Geo.csv")
	for line in file.readlines():
		line_arr = line[:-2].split(",")
		lat = float(line_arr[-2])
		lon = float(line_arr[-1])
		zoom_list = getZooms(lat, lon)
		zoom_str = ""
		for x in xrange(0, len(zoom_list)):
			zoom_str = zoom_str + 'z' + str(zoom_list[x])
		line_arr.append(zoom_str)
		geos.append(line_arr)

	with open('../data/2010_Census_Populations_Geo.csv', 'wb') as csvfile:
	    spamwriter = csv.writer(csvfile, delimiter=',')
	    for geo in geos:
	    	print geo
	    	spamwriter.writerow(geo)
def getZooms(lat, lon):
	zoom = []
	for x in xrange(0, len(standard)):
		local = standard[x]
		if lat < local[0] and lon < local[1] and lat > local[2] and lon > local[3]:
			zoom.append(x + 8)
	return zoom

def slimtData():
	results = []
	type_lists = ["AG", "ENT", "CON", "SOC", "FIN", "INF", "MAN", "MIN", "BUS", "RET", "TRA", "UTL", "WHO", "GOV", "TOT", "NAT"]
	years = [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013]
	file = open("../data/realGDP_metro_2001-2013a.csv")
	skip = True
	for line in file.readlines():
		if skip:
			skip = False
			continue
		line_list = line[:-1].split(",")
		metro = line_list[0].replace(" ", "-").replace("'", "-")
		lat = line_list[2]
		lon = line_list[3]
		for x in xrange(0, len(type_lists)):
			for y in xrange(0, len(years)):
				GDP = line_list[4 + x * len(years) + y]
				ret = [metro, lat, lon, x, years[y], GDP]
				results.append(ret)
	with open('../data/realGDP_metro_years.csv', 'wb') as csvfile:
	    spamwriter = csv.writer(csvfile, delimiter=',')
	    for result in results:
	    	spamwriter.writerow(result)
def cleanGeo():
	results = []
	file = open("../data/realGDP_metro_2001-2013a.csv")
	skip = True
	for line in file.readlines():
		if skip:
			skip = False
			continue
		line_list = line[:-1].split(",")
		metro = line_list[0].replace(" ", "-").replace("'", "-")
		lat = line_list[2]
		lon = line_list[3]
		ret = [metro, lat, lon]
		results.append(ret)
	with open('../data/metro_geo.tsv', 'wb') as tsvfile:
		tsvfile.write("metro\tgeo\n")
		for result in results:
			print result
			tsvfile.write(result[0] + "\t" + result[1] + "," + result[2] + "\n")
	    
# slimtData()
# addGeo()
# addZoom()
cleanGeo()