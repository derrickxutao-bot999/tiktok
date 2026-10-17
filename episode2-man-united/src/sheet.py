import numpy as np
from PIL import Image
from style import *
from chars import *
def sheet(path):
    W2,H2=2400,1400
    out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W2}" height="{H2}"><rect width="100%" height="100%" fill="{C["ivory"]}"/>']
    A=Figure("adult"); K=Figure("child"); F=Figure("father"); T=Figure("teen"); M1=Figure("mate1"); M2=Figure("mate2")
    s=0.9
    out.append(A.svg(standing_side(),150,1300,s,"side"))
    out.append(A.svg(walking_front(0.15),400,1300,s,"front"))
    out.append(A.svg(standing_back(),650,1300,s,"back"))
    out.append(A.svg(seated_side(),1000,1000,s,"side",expr=dict(lid=1,brow=-2)))
    out.append(A.svg(seated_back(arm="remote"),1250,1000,s,"back"))
    A2=Figure("adult"); A2.scarf=True
    out.append(A2.svg(standing_side(arm="scarf2"),1500,1300,s,"side"))
    out.append(K.svg(walking_front(0.3),1680,1300,s*0.62,"front"))
    out.append(F.svg(walking_front(0.6),1880,1300,s*1.03,"front"))
    out.append(T.svg(seated_back(),2100,1000,s*0.92,"back"))
    out.append(M1.svg(seated_back(),2250,1000,s*0.92,"back"))
    out.append(K.svg(seated_back(),1250,1350,s*0.62,"back"))
    out.append(M2.svg(seated_side(arm="phone"),2300,1350,s*0.9,"side"))
    out.append('</svg>')
    im=svg_png("\n".join(out)); im.save(path)
sheet("/tmp/claude-0/-home-user-tiktok/466f4f0d-11f8-5d82-8bba-02f4d479c414/scratchpad/sheet.png")
