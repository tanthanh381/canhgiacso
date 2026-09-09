"use client";
import { useEffect, useRef, useState } from 'react';
import type { CertificateTemplate } from './data';
import { certificateParts, defaultCertificateDesign, partLabels, type CertificatePart, type CertificateElement } from './certificate-design';
import { renderCertificateCanvas, downloadTrainingCertificatePdf, type TrainingCertificate } from './certificate';
const sample: TrainingCertificate={certificateId:'preview',certificateCode:'CGS-DEMO',runId:'preview',issuedAt:'2026-09-09',displayName:'NGUYỄN VĂN A',username:'nguyenvana',scenarioTotal:42,completed:42,correct:42,accuracy:100,score:5040,rating:'XUẤT SẮC'};
export function CertificateEditor({template,onChange}:{template:CertificateTemplate;onChange:(value:CertificateTemplate)=>void}) {
 const design=template.design??defaultCertificateDesign();
 const [selected,setSelected]=useState<CertificatePart>('title');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const preview=useRef<HTMLCanvasElement>(null);
 const stage=useRef<HTMLDivElement>(null);
 const drag=useRef<{id:CertificatePart;x:number;y:number;startX:number;startY:number;width:number;height:number;scaleX:number;scaleY:number}|null>(null);
 const uploadVersion=useRef(0);
 const current=useRef(template);current.current=template;
 const active=design.elements[selected];
 function patchElement(patch:Partial<CertificateElement>) {
   const base=current.current.design??defaultCertificateDesign();const e={...base.elements[selected],...patch};
   e.width=Math.max(40,Math.min(1754,e.width));e.height=Math.max(30,Math.min(1240,e.height));
   e.x=Math.max(0,Math.min(1754-e.width,e.x));e.y=Math.max(0,Math.min(1240-e.height,e.y));
   onChange({...current.current,design:{...base,elements:{...base.elements,[selected]:e}}});
 }
 useEffect(()=>{let cancelled=false;renderCertificateCanvas(sample,template).then(canvas=>{if(!cancelled){preview.current?.getContext('2d')?.drawImage(canvas,0,0);setError('');}}).catch(()=>{if(!cancelled)setError('Không thể xem trước. Hãy thử chọn lại logo.');});return()=>{cancelled=true;};},[template]);
 async function upload(file?:File){if(!file)return;const version=++uploadVersion.current;setError('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Chọn ảnh PNG, JPG hoặc WebP tối đa 5 MB.');return;}
  try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const logo=canvas.toDataURL('image/webp',.85);if(logo.length>400000)throw new Error();if(version!==uploadVersion.current)return;onChange({...current.current,design:{...(current.current.design??defaultCertificateDesign()),logo}});setSelected('logo');}catch{setError('Không đọc được ảnh hoặc ảnh quá lớn. Hãy chọn logo nhỏ hơn.');}}
 return <section className="cert-editor" aria-label="Trình thiết kế chứng chỉ">
  <div className="cert-toolbar"><div><h3>Thiết kế trực quan</h3><p>Chọn và kéo từng thành phần. Dùng phím mũi tên để dịch chuyển; giữ Shift để di chuyển nhanh.</p></div>
  {!template.design&&<button className="primary-button" onClick={()=>onChange({...template,design:defaultCertificateDesign()})}>Bật chỉnh sửa bố cục</button>}
  <button className="admin-secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await downloadTrainingCertificatePdf(sample,template);}catch{setError('Không thể tạo PDF thử. Hãy kiểm tra logo.');}finally{setBusy(false);}}}>{busy?'Đang tạo…':'Tải PDF thử'}</button>
  <button className="admin-secondary" onClick={()=>{uploadVersion.current++;const {design:removed,...rest}=template;void removed;onChange(rest);}}>Về bố cục gốc</button></div>
  {error&&<p role="alert">{error}</p>}
  <div className="cert-workspace"><div className="cert-stage" ref={stage}>
   <canvas ref={preview} width={1754} height={1240} aria-label="Xem trước chứng chỉ với dữ liệu mẫu" />
   {template.design&&certificateParts.map(id=>{const e=design.elements[id];return <button key={id} type="button" className={`cert-hit ${selected===id?'selected':''}`} aria-label={partLabels[id]} aria-pressed={selected===id} style={{left:`${e.x/1754*100}%`,top:`${e.y/1240*100}%`,width:`${e.width/1754*100}%`,height:`${e.height/1240*100}%`}}
    onFocus={()=>setSelected(id)} onPointerDown={event=>{if(event.button!==0)return;setSelected(id);event.currentTarget.setPointerCapture(event.pointerId);const rect=stage.current!.getBoundingClientRect();drag.current={id,x:e.x,y:e.y,startX:event.clientX,startY:event.clientY,width:e.width,height:e.height,scaleX:1754/rect.width,scaleY:1240/rect.height};}}
    onPointerMove={event=>{const d=drag.current;if(!d||d.id!==id)return;const base=current.current.design!;onChange({...current.current,design:{...base,elements:{...base.elements,[id]:{...base.elements[id],x:Math.round(Math.max(0,Math.min(1754-d.width,d.x+(event.clientX-d.startX)*d.scaleX))),y:Math.round(Math.max(0,Math.min(1240-d.height,d.y+(event.clientY-d.startY)*d.scaleY)))}}}});}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onKeyDown={event=>{const step=event.shiftKey?10:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();patchElement({x:e.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:e.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)});}}}><span>{partLabels[id]}</span></button>;})}
  </div><aside className="cert-properties">
   <label>Logo PNG, JPG, WebP<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}} /></label>
   {design.logo&&<button onClick={()=>{uploadVersion.current++;onChange({...template,design:{...design,logo:''}});}}>Xóa logo</button>}
   <label>Màu nền<input type="color" value={design.background} onChange={event=>onChange({...template,design:{...design,background:event.target.value}})} /></label>
   <label>Màu viền<input type="color" value={design.border} onChange={event=>onChange({...template,design:{...design,border:event.target.value}})} /></label>
   <label>Thành phần<select value={selected} onChange={event=>setSelected(event.target.value as CertificatePart)}>{certificateParts.map(id=><option value={id} key={id}>{partLabels[id]}</option>)}</select></label>
   <label>Màu thành phần<input type="color" value={active.color} onChange={event=>patchElement({color:event.target.value})} /></label>
   {([['x','Vị trí ngang',0,1754],['y','Vị trí dọc',0,1240],['width','Chiều rộng',40,1754],['height','Chiều cao',30,1240],['fontSize','Cỡ chữ',10,100]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} value={active[key]} onChange={event=>{const n=event.target.valueAsNumber;if(Number.isFinite(n))patchElement({[key]:Math.max(min,Math.min(max,n))});}} /></label>)}
   <label>Căn chữ<select value={active.align} onChange={event=>patchElement({align:event.target.value as CertificateElement['align']})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label>
   <p>Dữ liệu trên mẫu chỉ để xem trước. Chọn “Lưu bản nháp” hoặc “Xuất bản” để lưu thiết kế cùng nội dung.</p>
  </aside></div>
 </section>;
}
