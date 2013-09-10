#!/bin/sh

TARGETDIR=../wp-imageomap-$1

mkdir ${TARGETDIR}
mkdir ${TARGETDIR}/images

cp style.css        ${TARGETDIR}
cp wp-imageomap.js  ${TARGETDIR}
cp wp-imageomap.php ${TARGETDIR}
cp exif-reader.php  ${TARGETDIR}
cp README.txt       ${TARGETDIR}
cp -r pel           ${TARGETDIR}
cp -r languages     ${TARGETDIR}
cp images/*.png     ${TARGETDIR}/images
