export const certificateParts = ['logo', 'hdbankLogo', 'organizationName', 'departmentName', 'eyebrow', 'title', 'recipientIntro', 'recipient', 'account', 'description', 'rating', 'issued', 'footerNote'] as const;
export type CertificatePart = typeof certificateParts[number];
export type CertificateElement = { x: number; y: number; width: number; height: number; fontSize: number; color: string; align: 'left' | 'center' | 'right' };
export type CertificateDesign = { background: string; border: string; logo: string; hdbankLogo: string; elements: Record<CertificatePart, CertificateElement> };
export const partLabels: Record<CertificatePart, string> = { logo:'Logo Team/đơn vị', hdbankLogo:'Logo HDBank', organizationName:'Tên tổ chức', departmentName:'Đơn vị', eyebrow:'Tiêu đề nhỏ', title:'Tiêu đề', recipientIntro:'Lời trao', recipient:'Tên học viên', account:'Tài khoản và mã', description:'Mô tả', rating:'Xếp loại', issued:'Ngày cấp và mã', footerNote:'Ghi chú' };

export function defaultCertificateDesign(): CertificateDesign {
 const box = (x:number,y:number,width:number,height:number,fontSize:number,color='#0f2847'):CertificateElement => ({x,y,width,height,fontSize,color,align:'center'});
 return {background:'#fffaf0',border:'#d89a68',logo:'',hdbankLogo:'',elements:{
 logo:box(270,92,112,112,48,'#d90000'), hdbankLogo:box(1390,82,250,118,32,'#e30613'), organizationName:box(410,108,900,50,38,'#c50000'), departmentName:box(410,165,900,40,22),
 eyebrow:box(150,265,1454,45,21,'#9a3e00'),title:box(150,325,1454,90,53,'#0f172a'),recipientIntro:box(200,445,1354,50,22,'#475569'),
 recipient:box(220,510,1314,70,54,'#b00000'),account:box(150,595,1454,50,23),description:box(277,685,1200,115,23),
 rating:box(690,820,374,170,25,'#a00000'),issued:box(145,1080,1464,40,17,'#475569'),footerNote:box(145,1135,1464,50,15,'#64748b') }};
}

export function normalizeCertificateDesign(value: unknown): CertificateDesign | null {
 if (!value || typeof value !== 'object') return null;
 const d=value as Partial<CertificateDesign> & { elements?: Partial<Record<CertificatePart, CertificateElement>> };
 const defaults=defaultCertificateDesign();
 const color=(v:unknown)=>typeof v==='string' && /^#[0-9a-f]{6}$/i.test(v);
 const image=(v:unknown)=>typeof v==='string' && v.length<=400000 && (v===''||/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(v));
 if(!color(d.background)||!color(d.border)||!image(d.logo)||!image(d.hdbankLogo??'')||!d.elements) return null;
 const elements={} as CertificateDesign['elements'];
 for(const key of certificateParts){
   const e=d.elements[key]??(key==='hdbankLogo'?defaults.elements.hdbankLogo:undefined);
   if(!e||![e.x,e.y,e.width,e.height,e.fontSize].every(Number.isFinite)||e.x<0||e.y<0||e.width<40||e.height<30||e.x+e.width>1754||e.y+e.height>1240||e.fontSize<10||e.fontSize>100||!color(e.color)||!['left','center','right'].includes(e.align))return null;
   elements[key]={x:e.x,y:e.y,width:e.width,height:e.height,fontSize:e.fontSize,color:e.color,align:e.align};
 }
 return {background:d.background!,border:d.border!,logo:d.logo!,hdbankLogo:d.hdbankLogo??'',elements};
}
