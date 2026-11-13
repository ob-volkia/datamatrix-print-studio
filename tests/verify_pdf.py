"""Optional independent roundtrip check. pip install pymupdf numpy zxing-cpp"""
import argparse
from pathlib import Path
import pymupdf as pdf
import numpy as np
import zxingcpp
p=argparse.ArgumentParser();p.add_argument('csv');p.add_argument('pdf');p.add_argument('--start',type=int,default=1);p.add_argument('--digits',type=int,default=5);args=p.parse_args()
raw=Path(args.csv).read_bytes().removeprefix(b'\xef\xbb\xbf')
records=raw.replace(b'\r\n',b'\n').replace(b'\r',b'\n').split(b'\n')
if records[-1]==b'':records.pop()
with pdf.open(args.pdf) as doc:
 assert len(doc)==len(records), 'This verifier expects one label per page.'
 for i,page in enumerate(doc):
  assert page.get_text().strip()==str(args.start+i).zfill(args.digits),f'Number mismatch, row {i+1}'
  pix=page.get_pixmap(matrix=pdf.Matrix(4,4),colorspace=pdf.csRGB)
  arr=np.frombuffer(pix.samples,np.uint8).reshape(pix.height,pix.width,3)
  codes=zxingcpp.read_barcodes(arr,formats=zxingcpp.BarcodeFormat.DataMatrix)
  assert len(codes)==1 and codes[0].bytes==records[i],f'Payload mismatch, row {i+1}'
  assert codes[0].symbology_identifier==']d2',f'Missing GS1 mode, row {i+1}'
  assert not page.get_images(),f'Unexpected raster image, row {i+1}'
 print(f'Verified {len(records)} labels: numbering, GS1, original payload bytes, vector output.')
