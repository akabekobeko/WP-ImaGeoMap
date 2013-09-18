#!/bin/sh

TARGETDIR=../wp-imageomap-$1

mkdir ${TARGETDIR}
mkdir ${TARGETDIR}/images

cp style.css        ${TARGETDIR}
cp wp-imageomap.js  ${TARGETDIR}
cp wp-imageomap.php ${TARGETDIR}
cp exif-reader.php  ${TARGETDIR}
cp readme.txt       ${TARGETDIR}
cp screenshot-1.png ${TARGETDIR}
cp screenshot-2.png ${TARGETDIR}
cp screenshot-3.png ${TARGETDIR}
cp -r pel           ${TARGETDIR}
cp -r languages     ${TARGETDIR}
cp images/*.png     ${TARGETDIR}/images

find ${TARGETDIR} -name ".DS_Store" -print -exec rm {} ";"
zip -r ${TARGETDIR}.zip ${TARGETDIR}
rm -rf ${TARGETDIR}
