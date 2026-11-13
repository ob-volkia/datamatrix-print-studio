import {createElement,Link2,Link2Off,Upload,Download,ChevronLeft,ChevronRight,RotateCcw,X,Tag,FileText} from 'lucide';
const icons={link:Link2,unlink:Link2Off,upload:Upload,download:Download,previous:ChevronLeft,next:ChevronRight,reset:RotateCcw,cancel:X,label:Tag,sheet:FileText};
export function icon(name){
 return createElement(icons[name],{width:18,height:18,'stroke-width':1.8,'aria-hidden':'true',focusable:'false'});
}
export function mountIcons(root=document){
 for(const slot of root.querySelectorAll('[data-icon]'))slot.replaceChildren(icon(slot.dataset.icon));
}
export function syncAspectButton(button,locked){
 button.setAttribute('aria-pressed',String(locked));
 button.title=locked?'Разорвать связь ширины и высоты':'Связать ширину и высоту';
 const name=locked?'link':'unlink';
 if(button.dataset.state!==name){button.replaceChildren(icon(name));button.dataset.state=name;}
}
