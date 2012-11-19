#!/bin/sh
FILES=../queue/*
for f in $FILES
do
	echo "file=@$f"
	# curl -X POST --form "file=@$f" http://localhost:3000/
	curl -X POST --form "file=@$f" http://199.241.142.51:3000/
	# rm -rf "$f"
	# sleep 0.1
done