"use client";
/* eslint-disable @next/next/no-img-element -- certificate previews use runtime data URLs and cannot use Next image optimization */
import { useEffect, useRef, useState } from 'react';
import type { CertificateTemplate } from './data';
import { certificateParts, defaultCertificateDesign, classicCertificateDesign, partLabels, type CertificatePart, type CertificateElement } from './certificate-design';
import { renderCertificateCanvas, downloadTrainingCertificatePdf, type TrainingCertificate } from './certificate';
const sample: TrainingCertificate={certificateId:'preview',certificateCode:'CGS-DEMO',runId:'preview',issuedAt:'2026-09-09',displayName:'Nguyễn Văn A',username:'nguyenvana',scenarioTotal:42,completed:42,correct:42,accuracy:100,score:5040,rating:'XUẤT SẮC'};
export function CertificateThumbnail({template}:{template:CertificateTemplate}) {
 const [image,setImage]=useState('');const [error,setError]=useState('');
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let active=true;const timer=window.setTimeout(()=>{void renderCertificateCanvas(sample,template).then(canvas=>{if(active){setImage(canvas.toDataURL('image/jpeg',.9));setError('');}}).catch(()=>{if(active)setError('Chưa tải được mẫu. Vui lòng tải lại trang.');});},120);return()=>{active=false;window.clearTimeout(timer);};},[template]);
 return <aside className="certificate-thumbnail"><h3>Xem trước chứng nhận</h3><p>Cập nhật theo nội dung đang chỉnh sửa · Dữ liệu minh họa</p>{error&&<p role="alert">{error}</p>}{image?<button type="button" className="certificate-thumbnail-button" onClick={()=>dialog.current?.showModal()} aria-label="Phóng to mẫu chứng nhận"><img src={image} alt="Thumbnail chứng nhận với tên Nguyễn Văn A và dữ liệu minh họa" /></button>:<p>Đang tạo bản xem trước…</p>}<small>Bấm vào mẫu để phóng to. Bản PDF sử dụng cùng bố cục này.</small><dialog ref={dialog} className="certificate-preview-dialog"><button type="button" onClick={()=>dialog.current?.close()}>Đóng bản xem trước</button>{image&&<img src={image} alt="Chứng nhận mẫu phóng to" />}</dialog></aside>;
}
const editableCertificateParts=certificateParts.filter((id):id is CertificatePart=>id!=='hdbankLogo');
export function CertificateEditor({template,onChange}:{template:CertificateTemplate;onChange:(value:CertificateTemplate)=>void}) {
 const design=template.design??defaultCertificateDesign();
 const [selected,setSelected]=useState<CertificatePart>('title');
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const preview=useRef<HTMLCanvasElement>(null);
 const stage=useRef<HTMLDivElement>(null);
 const drag=useRef<{id:CertificatePart;x:number;y:number;startX:number;startY:number;width:number;height:number;scaleX:number;scaleY:number}|null>(null);
 const uploadVersion=useRef(0);
 const current=useRef(template);
 useEffect(()=>{current.current=template;},[template]);
 const active=design.elements[selected];
 const imageSelected=selected==='logo';
 function patchElement(patch:Partial<CertificateElement>) {
   const base=current.current.design??defaultCertificateDesign();const e={...base.elements[selected],...patch};
   e.width=Math.max(40,Math.min(1754,e.width));e.height=Math.max(30,Math.min(1240,e.height));
   e.x=Math.max(0,Math.min(1754-e.width,e.x));e.y=Math.max(0,Math.min(1240-e.height,e.y));
   onChange({...current.current,design:{...base,elements:{...base.elements,[selected]:e}}});
 }
 useEffect(()=>{let cancelled=false;renderCertificateCanvas(sample,template).then(canvas=>{if(!cancelled){preview.current?.getContext('2d')?.drawImage(canvas,0,0);setError('');}}).catch(()=>{if(!cancelled)setError('Không thể xem trước. Hãy thử chọn lại logo.');});return()=>{cancelled=true;};},[template]);
 async function upload(file?:File){if(!file)return;const version=++uploadVersion.current;setError('');
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){setError('Chọn ảnh PNG, JPG hoặc WebP tối đa 5 MB.');return;}
  try{const bitmap=await createImageBitmap(file);const canvas=document.createElement('canvas');const scale=Math.min(1,600/Math.max(bitmap.width,bitmap.height));canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d')!.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const data=canvas.toDataURL('image/webp',.85);if(data.length>400000)throw new Error();if(version!==uploadVersion.current)return;const base=current.current.design??defaultCertificateDesign();onChange({...current.current,design:{...base,logo:data}});setSelected('logo');}catch{setError('Không đọc được ảnh hoặc ảnh quá lớn. Hãy chọn logo nhỏ hơn.');}}
 function clearLogo(){uploadVersion.current++;const base=current.current.design??defaultCertificateDesign();onChange({...current.current,design:{...base,logo:''}});setSelected('logo');}
 return <section className="cert-editor" aria-label="Trình thiết kế chứng nhận">
  <div className="cert-toolbar"><div><h3>Thiết kế trực quan</h3><p>Chọn và kéo từng thành phần. Dùng phím mũi tên để dịch chuyển; giữ Shift để di chuyển nhanh.</p></div>
  {!template.design&&<button className="primary-button" onClick={()=>onChange({...template,design:defaultCertificateDesign()})}>Bật chỉnh sửa bố cục</button>}
  <button className="admin-secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await downloadTrainingCertificatePdf(sample,template);}catch{setError('Không thể tạo PDF thử. Hãy kiểm tra logo.');}finally{setBusy(false);}}}>{busy?'Đang tạo…':'Tải PDF thử'}</button>
  <button className="admin-secondary" onClick={()=>{uploadVersion.current++;onChange({...template,design:defaultCertificateDesign()});}}>Mẫu xanh công nghệ</button>
  <button className="admin-secondary" onClick={()=>{uploadVersion.current++;onChange({...template,design:classicCertificateDesign()});}}>Mẫu nền sáng</button></div>
  {error&&<p role="alert">{error}</p>}
  <div className="cert-workspace"><div className="cert-stage" ref={stage}>
   <canvas ref={preview} width={1754} height={1240} aria-label="Xem trước chứng nhận với dữ liệu mẫu" />
   {template.design&&editableCertificateParts.map(id=>{const e=design.elements[id];return <button key={id} type="button" className={`cert-hit ${selected===id?'selected':''}`} aria-label={partLabels[id]} aria-pressed={selected===id} style={{left:`${e.x/1754*100}%`,top:`${e.y/1240*100}%`,width:`${e.width/1754*100}%`,height:`${e.height/1240*100}%`}}
    onFocus={()=>setSelected(id)} onPointerDown={event=>{if(event.button!==0)return;setSelected(id);event.currentTarget.setPointerCapture(event.pointerId);const rect=stage.current!.getBoundingClientRect();drag.current={id,x:e.x,y:e.y,startX:event.clientX,startY:event.clientY,width:e.width,height:e.height,scaleX:1754/rect.width,scaleY:1240/rect.height};}}
    onPointerMove={event=>{const d=drag.current;if(!d||d.id!==id)return;const base=current.current.design!;onChange({...current.current,design:{...base,elements:{...base.elements,[id]:{...base.elements[id],x:Math.round(Math.max(0,Math.min(1754-d.width,d.x+(event.clientX-d.startX)*d.scaleX))),y:Math.round(Math.max(0,Math.min(1240-d.height,d.y+(event.clientY-d.startY)*d.scaleY)))}}}});}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onKeyDown={event=>{const step=event.shiftKey?10:1;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();patchElement({x:e.x+(event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0),y:e.y+(event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0)});}}}><span>{partLabels[id]}</span></button>;})}
  </div><aside className="cert-properties">
   <fieldset><legend>Logo chứng nhận</legend>
    <label>Logo Team/đơn vị (bên trái)<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event=>{void upload(event.target.files?.[0]);event.target.value='';}} /></label>
    {design.logo&&<button type="button" onClick={clearLogo}>Xóa logo Team/đơn vị</button>}
   </fieldset>
   {design.theme==='cyber'?<p>Nền xanh và họa tiết dùng theo mẫu. Bạn có thể kéo, đổi màu và cỡ chữ của các thành phần.</p>:<><label>Màu nền<input type="color" value={design.background} onChange={event=>onChange({...template,design:{...design,background:event.target.value}})} /></label>
   <label>Màu viền<input type="color" value={design.border} onChange={event=>onChange({...template,design:{...design,border:event.target.value}})} /></label></>}
   <label>Thành phần<select value={selected} onChange={event=>setSelected(event.target.value as CertificatePart)}>{editableCertificateParts.map(id=><option value={id} key={id}>{partLabels[id]}</option>)}</select></label>
   {!imageSelected&&<label>Màu thành phần<input type="color" value={active.color} onChange={event=>patchElement({color:event.target.value})} /></label>}
   {([['x','Vị trí ngang',0,1754],['y','Vị trí dọc',0,1240],['width','Chiều rộng',40,1754],['height','Chiều cao',30,1240]] as const).map(([key,label,min,max])=><label key={key}>{label}<input type="number" min={min} max={max} value={active[key]} onChange={event=>{const n=event.target.valueAsNumber;if(Number.isFinite(n))patchElement({[key]:Math.max(min,Math.min(max,n))});}} /></label>)}
   {!imageSelected&&<><label>Cỡ chữ<input type="number" min={10} max={100} value={active.fontSize} onChange={event=>{const n=event.target.valueAsNumber;if(Number.isFinite(n))patchElement({fontSize:Math.max(10,Math.min(100,n))});}} /></label><label>Căn chữ<select value={active.align} onChange={event=>patchElement({align:event.target.value as CertificateElement['align']})}><option value="left">Trái</option><option value="center">Giữa</option><option value="right">Phải</option></select></label></>}
   <p>Dữ liệu trên mẫu chỉ để xem trước. Chọn “Lưu bản nháp” hoặc “Xuất bản” để lưu thiết kế, logo Team/đơn vị và nội dung.</p>
  </aside></div>
 </section>;
}
