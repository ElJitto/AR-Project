from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math
ROOT=Path(__file__).resolve().parent
src=Image.open('/mnt/data/a_vibrant_clean_cel_shaded_anime_pokémon_style.png').convert('RGB')
# Target physical size: 63 x 88 mm @ 300 dpi
W,H=round(63/25.4*300), round(88/25.4*300)
card=Image.new('RGB',(W,H),(254,248,224))
d=ImageDraw.Draw(card)
# Header (new artwork added outside the source image, rather than distorting the drawing)
d.rounded_rectangle([6,5,W-7,H-6],radius=37,fill=(251,243,219),outline=(145,18,29),width=9)
d.rounded_rectangle([17,14,W-18,83],radius=20, fill=(178,30,40))
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
heading=ImageFont.truetype(font,36)
small=ImageFont.truetype(font,20)
footer=ImageFont.truetype(font,31)
def center(text,font,y,color):
 b=d.textbbox((0,0),text,font=font)
 d.text(((W-(b[2]-b[0]))/2,y),text,font=font,fill=color)
center('FOX SPIRITS',heading,24,(255,245,218))
# Preserve the exact stylized art & all key visual details in its original aspect ratio
art_width=W-40
art_height=round(art_width*src.height/src.width)
art=src.resize((art_width,art_height),Image.Resampling.LANCZOS)
mask=Image.new('L',(art_width,art_height),0);md=ImageDraw.Draw(mask)
md.rounded_rectangle([0,0,art_width-1,art_height-1],radius=28,fill=255)
art_top=90
card.paste(art,(20,art_top),mask)
d.rounded_rectangle([19,art_top-1,W-20,art_top+art_height],radius=29,outline=(168,38,41),width=5)
foot_y=art_top+art_height+13
center('TWIN NINE-TAILS',footer,foot_y,(136,22,36))
center('AR COLLECTOR CARD  •  001',small,foot_y+43,(106,67,71))
# small decorative accents
d.line([(90,H-34),(245,H-34)],fill=(200,147,57),width=3)
d.line([(W-245,H-34),(W-90,H-34)],fill=(200,147,57),width=3)
card.save(ROOT/'card.png',dpi=(300,300))

# A4 high-res sheets with precision trim marks. Do not include marks in tracking target.
A4W,A4H=round(210/25.4*300), round(297/25.4*300)
def new_sheet(): return Image.new('RGB',(A4W,A4H),(255,255,255))
def put_card(sheet,x,y):
 sheet.paste(card,(x,y))
 dr=ImageDraw.Draw(sheet)
 q=24; gap=8; color=(80,80,80)
 for xx,sign in [(x,-1),(x+W,1)]:
  for yy in [y,y+H]:
   dr.line([(xx+sign*gap, yy),(xx+sign*(gap+q),yy)],fill=color,width=2)
 for yy,sign in [(y,-1),(y+H,1)]:
  for xx in [x,x+W]:
   dr.line([(xx,yy+sign*gap),(xx, yy+sign*(gap+q))],fill=color,width=2)

single=new_sheet();put_card(single,(A4W-W)//2,(A4H-H)//2)
single.save(ROOT/'print_A4_single_300dpi.png',dpi=(300,300),optimize=True)
six=new_sheet()
spacing_x=70; spacing_y=55
bx=(A4W-2*W-spacing_x)//2;by=(A4H-3*H-2*spacing_y)//2
for i in range(2):
 for j in range(3): put_card(six,bx+i*(W+spacing_x),by+j*(H+spacing_y))
six.save(ROOT/'print_A4_six_300dpi.png',dpi=(300,300),optimize=True)
print('Generated',W,H,A4W,A4H)
