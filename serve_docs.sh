#!/bin/sh
echo "Serving documentation at http://localhost:8000/docs/"
busybox httpd -f -p 8000 -h .
