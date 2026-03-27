const WEB_APP_URL="https://script.google.com/macros/s/AKfycbxgexynCz_7s_P2gf4CME7sgjHti6ZTjQlXYAk51yEsCtlyf0yVFeCBz-sXu48YvQWg/exec";
window.WEB_APP_URL = WEB_APP_URL;
let currentUser=null;
let allBookedData=[];
let unavailableDates=[];
let selectedAmenity=null;
let selectedStart=null;
let selectedEnd=null;
let fdnCache=null;
const today=new Date();today.setHours(0,0,0,0);
const sixMonthsLimit=new Date();sixMonthsLimit.setMonth(today.getMonth()+6);
let startMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
let endMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
document.getElementById('login-container').addEventListener('keypress',e=>{if(e.key==='Enter')handleLogin();});
function toggleView(view){
 document.getElementById("dashboard-view").style.display=view==='dashboard' ? 'block':'none';
 document.getElementById("profile-view").style.display=view==='profile' ? 'block':'none';
 document.getElementById("booking-view").style.display=view==='booking' ? 'block':'none';
 document.getElementById("fdn-view").style.display=view==='fdn' ? 'block':'none';
 document.getElementById("bulletin-view").style.display=view==='bulletin' ? 'block':'none';
 document.getElementById("contacts-view").style.display=view==='contacts' ? 'block':'none';
 document.getElementById("library-view").style.display=view==='library' ? 'block':'none';
 
 if(view!=='bulletin'&&bbExpiryInterval){clearInterval(bbExpiryInterval);bbExpiryInterval=null;}
 
 setTimeout(()=>{document.getElementById('page-top').scrollIntoView({behavior:'smooth',block:'start'});},30);
}
function openBuildingContacts(){toggleView('contacts');}
function toggleContactsSection(section){
 const bodyId=section==='building' ? 'building-contacts-body':'hoa-contacts-body';
 const iconId=section==='building' ? 'building-toggle-icon':'hoa-toggle-icon';
 const body=document.getElementById(bodyId);
 const icon=document.getElementById(iconId);
 const isOpen=body.style.display!=='none';
 body.style.display=isOpen ? 'none':'block';
 icon.textContent=isOpen ? '▸':'▾';
}
function handleLogin(){
 const btn=document.getElementById("btnLogin");
 const email=document.getElementById("loginEmail").value;
 const pass=document.getElementById("loginPassword").value;
 if(!email||!pass)return ;
 btn.disabled=true;btn.textContent="Logging in ...";
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({action:"login",email:email,password:pass})})
 .then(res=>res.json()).then(data=>{
 if(data.success){
 document.getElementById("login-error").style.display="none";
 sessionStorage.setItem("residentUser",JSON.stringify(data.profile));
 initApp(data.profile);
}else{
 const err=document.getElementById("login-error");
 err.textContent="⚠ Incorrect email or password. Please try again.";
 err.style.display="block";
 btn.disabled=false;
 btn.textContent="Login";
}
})
 .catch(()=>{
 const err=document.getElementById("login-error");
 err.textContent="⚠ Connection error. Please check your internet and try again.";
 err.style.display="block";
 btn.disabled=false;
 btn.textContent="Login";
});
}
function initApp(profile){
 currentUser=profile;
 window.currentUser = profile;
 const role=(profile.role||"").toString().trim();
 const isAdmin=(role==="Admin"||role==="Staff");
 if(isAdmin){
 document.body.classList.add("admin-mode");
 
 document.getElementById("login-container").style.display="none";
 document.getElementById("main-app-content").style.display="none";
 document.getElementById("admin-app-content").style.display="block";
 document.getElementById("admin-name-display").textContent=profile.firstName+" "+profile.lastName;
 document.getElementById("admin-role-badge").textContent=role;
 adminNavigate('home',document.querySelector('[data-panel="home"]'));
 const snFab=document.getElementById("sn-fab"); const snPanel=document.getElementById("sn-floating-panel"); if(snFab) snFab.style.display=""; if(snPanel) snPanel.style.display=""; setTimeout(staffNotesInit, 150);
 prefetchDates();
}else{
 document.body.classList.remove("admin-mode");
 document.body.classList.add("logged-in");

 document.getElementById("login-container").style.display="none";
 document.getElementById("main-app-content").style.display="block";
 document.getElementById("admin-app-content").style.display="none";
 document.getElementById("userNameDisplay").textContent=profile.firstName;
 document.getElementById("userUnitDisplay").textContent=profile.unit;
 populateProfileFields(profile);
 const snFab=document.getElementById("sn-fab");
 const snPanel=document.getElementById("sn-floating-panel");
 if(snFab) snFab.style.display="none";
 if(snPanel) snPanel.style.display="none";
 prefetchDates();
 prefetchFDN();
 prefetchBulletinBoard();
}
}
function prefetchDates(){
 fetch(WEB_APP_URL).then(res=>res.json()).then(data=>{
 allBookedData=data;
 renderMyReservations();
});
}
function prefetchFDN(){
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({action:"getFrontDeskInstructions",email:currentUser.email})})
 .then(res=>res.json()).then(data=>{if(data.success)fdnCache=data.instructions;});
}
function prefetchBulletinBoard(){
 fetch(BB_URL,{method:"POST",body:JSON.stringify({action:"getBulletinPosts"})})
 .then(res=>res.json())
 .then(json=>{
 if(!Array.isArray(json)||json.error)return ;
 const now=new Date();
 bbPostsCache=json
 .filter(p=>p.id&&p.category&&p.title)
 .filter(p=>!p.expiresAt||new Date(p.expiresAt)>now)
 .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 bbCacheLoaded=true;
 bbUpdateSidebarBadges();
})
 .catch(()=>{});
}
function renderMyReservations(){
 if(!currentUser||!allBookedData.length)return ;
 const userEmail=currentUser.email.toLowerCase().trim();
 const todayMs=new Date();todayMs.setHours(0,0,0,0);
 
 const mine=allBookedData
 .filter(b=>b.email&&b.email===userEmail)
 .filter(b=>{const d=new Date(b.start);d.setHours(0,0,0,0);return d>=todayMs;})
 .sort((a,b)=>new Date(a.start)-new Date(b.start));
 const panel=document.getElementById("my-reservations");
 const rowsEl=document.getElementById("res-rows");
 const showMoreBtn=document.getElementById("res-show-more");
 if(!mine.length){panel.style.display='none';return ;}
 panel.style.display='block';
 rowsEl.innerHTML="";
 rowsEl.dataset.expanded="false";
 rowsEl.dataset.total=mine.length;
 const display=mine.slice(0,3);
 const extra=mine.slice(3);
 display.forEach(b=>rowsEl.appendChild(makeResRow(b)));
 if(extra.length){
 const extraWrap=document.createElement("div");
 extraWrap.id="res-extra";
 extraWrap.style.display="none";
 extra.forEach(b=>extraWrap.appendChild(makeResRow(b)));
 rowsEl.appendChild(extraWrap);
 showMoreBtn.style.display='block';
 showMoreBtn.textContent=`▼ Show All ${mine.length} Reservations`;
}else{
 showMoreBtn.style.display='none';
}
}
function makeResRow(b){
 const wrap=document.createElement("div");
 wrap.className="res-row-wrap";
 const div=document.createElement("div");
 div.className="res-row";
 const startDate=b.start||"";
 const endDate=(b.end&&b.end!==b.start)? ` – ${b.end}`:"";
 const time=b.startTime ? ` · ${b.startTime}${b.endTime ? ' – '+b.endTime:''}`:"";
 
 const bookingKey=encodeURIComponent(JSON.stringify({amenity:b.amenity,start:b.start,end:b.end||b.start,startTime:b.startTime||"",endTime:b.endTime||""}));
 div.innerHTML=`
<span class ="res-amenity">${b.amenity}</span><span class ="res-date">${startDate}${endDate}${time}</span><button class ="res-cancel-btn" onclick="cancelReservation(this,'${bookingKey}')" title="Cancel reservation"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#c0392b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button>`;
 wrap.appendChild(div);
 return wrap;
}
function cancelReservation(btn,bookingKey){
 
 const existing=document.querySelector(".res-confirm-row");
 if(existing){
 
 if(existing.previousElementSibling&&existing.previousElementSibling.querySelector('.res-cancel-btn')===btn){
 existing.remove();
 return ;
}
 existing.remove();
}
 const rowWrap=btn.closest(".res-row-wrap");
 const confirmDiv=document.createElement("div");
 confirmDiv.className="res-confirm-row";
 confirmDiv.innerHTML=`
<span style="font-size:13px;color:#c0392b;font-weight:bold;">Remove this reservation?</span><span style="margin-left:12px;"><button onclick="confirmCancelReservation(this,'${bookingKey}')" style="background:#c0392b;color:white;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;margin-right:6px;">Remove</button><button onclick="this.closest('.res-confirm-row').remove()" style="background:#eee;color:#555;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;">Cancel</button></span>`;
 rowWrap.insertAdjacentElement("afterend",confirmDiv);
}
function confirmCancelReservation(btn,bookingKey){
 btn.disabled=true;
 btn.textContent="Removing...";
 let booking;
 try{booking=JSON.parse(decodeURIComponent(bookingKey));}catch(e){btn.textContent="Error";return ;}
 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({
 action:"cancelReservation",
 email:currentUser.email,
 firstName:currentUser.firstName,
 lastName:currentUser.lastName,
 unit:currentUser.unit,
 amenity:booking.amenity,
 start:booking.start,
 end:booking.end,
 startTime:booking.startTime,
 endTime:booking.endTime
})
})
 .then(res=>res.json())
 .then(data=>{
 if(data.success){
 
 const confirmRow=document.querySelector(".res-confirm-row");
 if(confirmRow){
 const resRowWrap=confirmRow.previousElementSibling;
 confirmRow.remove();
 if(resRowWrap)resRowWrap.remove();
}
 
 allBookedData=allBookedData.filter(b=>!(b.amenity===booking.amenity&&b.start===booking.start&&b.email===currentUser.email.toLowerCase().trim()));
 renderMyReservations();
}else{
 btn.disabled=false;
 btn.textContent="Remove";
 const confirmRow=document.querySelector(".res-confirm-row");
 if(confirmRow)confirmRow.querySelector('span:first-child').textContent="Error cancelling. Please try again.";
}
})
 .catch(()=>{
 btn.disabled=false;
 btn.textContent="Remove";
});
}
function toggleReservationsPanel(){
 const body=document.getElementById("res-body");
 const icon=document.getElementById("res-collapse-icon");
 const collapsed=body.style.display==="none";
 body.style.display=collapsed ? "block":"none";
 icon.textContent=collapsed ? "▲":"▼";
}
function toggleAllReservations(){
 const extraWrap=document.getElementById("res-extra");
 const btn=document.getElementById("res-show-more");
 const total=document.getElementById("res-rows").dataset.total;
 const expanded=extraWrap.style.display!=="none";
 extraWrap.style.display=expanded ? "none":"block";
 btn.textContent=expanded ? `▼ Show All ${total} Reservations`:"▲ Show Less";
}
function openBooking(){toggleView('booking');resetBooking();}
function resetBooking(){
 selectedAmenity=null;selectedStart=null;selectedEnd=null;
 startMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 endMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 document.querySelectorAll('.notice-wrapper').forEach(n=>n.style.display='none');
 document.getElementById("calendarContainer").classList.remove("enabled");
 document.getElementById("date-selection-summary").style.display="none";
 document.querySelectorAll('.amenity-btn').forEach(b=>b.classList.remove("active"));
 document.getElementById("resComments").value="";
 document.getElementById("submitBtn").disabled=true;
}
document.querySelectorAll('.amenity-btn').forEach(btn=>{
 btn.addEventListener('click',function(){
 selectedAmenity=this.dataset.value;
 document.querySelectorAll('.amenity-btn').forEach(b=>b.classList.remove("active"));
 this.classList.add("active");
 
 startMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 endMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 selectedStart=null;selectedEnd=null;
 document.querySelectorAll('.notice-wrapper').forEach(n=>n.style.display='none');
 const startH=document.getElementById("startCalendarHeader");
 const endH=document.getElementById("endCalendarHeader");
 const commentsLabel=document.getElementById("commentsLabel");
 if(selectedAmenity==="Conference Room"){
 document.getElementById("conferenceNotice").style.display='block';
 startH.textContent="Reservation Date";
 commentsLabel.innerHTML="Comments(Optional)";
}
 if(selectedAmenity==="Guest Suite"){
 document.getElementById("guestSuiteNotice").style.display='block';
 startH.textContent="Check-in Date";
 endH.textContent="Check-out Date";
 commentsLabel.innerHTML="Comments(Optional)";
}
 if(selectedAmenity==="Social Lounge"){
 document.getElementById("socialNotice").style.display='block';
 startH.textContent="Event Date";
 commentsLabel.innerHTML="Event Details<span style='color:red'>(required)*</span>";
}
 
 document.getElementById("calendarContainer").classList.add("enabled");
 document.getElementById("date-selection-summary").style.display="block";
 document.getElementById("endCalendarWrapper").style.display=(selectedAmenity==="Guest Suite")? "block":"none";
 document.getElementById("endWrapper").style.display=(selectedAmenity==="Guest Suite")? "block":"none";
 document.getElementById("timeWrapper").style.display=(selectedAmenity==="Guest Suite")? "none":"grid";
 
 document.getElementById("startLabel").textContent=(selectedAmenity==="Guest Suite")? "Check-in Date":(selectedAmenity==="Social Lounge" ? "Event Date":"Reservation Date");
 document.getElementById("endLabel").textContent="Check-out Date";
 unavailableDates=allBookedData.filter(b=>b.amenity===selectedAmenity);
 updateDateDisplay();
 renderCalendars();
 validateBooking();
});
});
function renderCalendars(){
 buildCalendar("start",document.getElementById("startCalendar"),document.getElementById("startMonthYear"),startMonthDate);
 buildCalendar("end",document.getElementById("endCalendar"),document.getElementById("endMonthYear"),endMonthDate);
}
function changeMonth(type,dir){
 if(type==='start')startMonthDate.setMonth(startMonthDate.getMonth()+dir);
 else endMonthDate.setMonth(endMonthDate.getMonth()+dir);
 renderCalendars();
}
function buildCalendar(type,container,header,monthDate){
 container.innerHTML="";
 header.textContent=`${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
["S","M","T","W","T","F","S"].forEach(d=>{
 let div=document.createElement("div");div.className="day-header";div.textContent=d;container.appendChild(div);
});
 
 const firstDay=new Date(monthDate.getFullYear(),monthDate.getMonth(),1).getDay();
 const daysInMonth=new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate();
 for(let i=0;i<firstDay;i++)container.appendChild(document.createElement("div"));
 for(let d=1;d<=daysInMonth;d++){
 let dateObj=new Date(monthDate.getFullYear(),monthDate.getMonth(),d);
 dateObj.setHours(0,0,0,0);
 let cell=document.createElement("div");cell.className="day";cell.textContent=d;
 
 
 let isBooked=false;
 if(selectedAmenity==="Guest Suite"){
 isBooked=unavailableDates.some(range=>{
 let s=new Date(range.start);let e=new Date(range.end||range.start);
 s.setHours(0,0,0,0);e.setHours(0,0,0,0);
 return dateObj>=s&&dateObj<=e;
});
}
 const tooFar=dateObj>sixMonthsLimit;
 let exceedsLimit=false;
 if(selectedAmenity==="Guest Suite"&&type==="end"&&selectedStart){
 const diffDays=Math.ceil((dateObj-selectedStart)/(1000*60*60*24));
 if(diffDays>4||diffDays<=0)exceedsLimit=true;
 
 if(unavailableDates.some(range=>{let s=new Date(range.start);s.setHours(0,0,0,0);return s>selectedStart&&s<dateObj;}))exceedsLimit=true;
}
 if(dateObj<today||tooFar||isBooked||exceedsLimit){
 cell.style.opacity="0.3";cell.style.pointerEvents="none";
 if(isBooked){cell.style.textDecoration="line-through";cell.style.color="red";}
}else{
 cell.addEventListener('click',()=>selectDate(type,dateObj));
}
 if(selectedStart&&+dateObj===+selectedStart)cell.classList.add("selected");
 if(selectedStart&&selectedEnd&&dateObj>=selectedStart&&dateObj<=selectedEnd)cell.classList.add("selected");
 container.appendChild(cell);
}
}
function selectDate(type,date){
 if(type==="start"){
 selectedStart=date;
 if(selectedAmenity!=="Guest Suite"){selectedEnd=date;populateTimes();}
 else{selectedEnd=null;endMonthDate=new Date(date.getFullYear(),date.getMonth(),1);}
}else{selectedEnd=date;}
 updateDateDisplay();renderCalendars();validateBooking();
}
function updateDateDisplay(){
 document.getElementById("displayStart").value=selectedStart ? selectedStart.toLocaleDateString():"";
 document.getElementById("displayEnd").value=selectedEnd ? selectedEnd.toLocaleDateString():"";
}
function timeToMinutes(timeStr){
 if(!timeStr)return -1;
 const match=timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
 if(!match)return -1;
 let hrs=parseInt(match[1]);
 const mins=parseInt(match[2]);
 const ampm=match[3].toUpperCase();
 if(ampm==='PM'&&hrs<12)hrs+=12;
 if(ampm==='AM'&&hrs===12)hrs=0;
 return hrs*60+mins;
}
function toISODate(d){
 const y=d.getFullYear();
 const m=String(d.getMonth()+1).padStart(2,"0");
 const day=String(d.getDate()).padStart(2,"0");
 return `${y}-${m}-${day}`;
}
function normalizeDateStr(date){
 const d=(date instanceof Date)? date:new Date(date);
 return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}
function populateTimes(){
 const startSelect=document.getElementById("startTime");
 startSelect.innerHTML="";
 
 
 const dateStr=normalizeDateStr(selectedStart);
 const bookingsToday=unavailableDates.filter(b=>normalizeDateStr(b.start)===dateStr&&b.amenity===selectedAmenity);
 for(let h=0;h<24;h++){
 for(let m of["00","30"]){
 const currentMins=h*60+parseInt(m);
 const displayH=h % 12||12;
 const ampm=h>=12 ? "PM":"AM";
 const val=`${h}:${m}`;
 const opt=document.createElement("option");opt.value=val;opt.textContent=`${displayH}:${m}${ampm}`;
 
 const isReserved=bookingsToday.some(b=>{
 const bStart=timeToMinutes(b.startTime);
 const bEnd=timeToMinutes(b.endTime);
 return currentMins>=bStart&&currentMins<bEnd;
});
 if(isReserved){
 opt.disabled=true;
 opt.textContent+="(Reserved)";
}
 startSelect.appendChild(opt);
}
}
 
 const preferred=startSelect.querySelector('option[value="7:00"]:not([disabled])');
 if(preferred)preferred.selected=true;
 handleStartTimeSync();
}
function handleStartTimeSync(){
 const startVal=document.getElementById("startTime").value;
 const endSelect=document.getElementById("endTime");
 if(!startVal)return ;
 const[h,m]=startVal.split(":").map(Number);
 const startMins=h*60+m;
 const dateStr=normalizeDateStr(selectedStart);
 const bookingsToday=unavailableDates.filter(b=>normalizeDateStr(b.start)===dateStr&&b.amenity===selectedAmenity);
 
 let nextBookingStart=1440;
 bookingsToday.forEach(b=>{
 const bStart=timeToMinutes(b.startTime);
 if(bStart>startMins&&bStart<nextBookingStart)nextBookingStart=bStart;
});
 endSelect.innerHTML="";
 let defaultSet=false;
 for(let i=0;i<=24;i++){
 for(let j of(i===24 ?[0]:[0,30])){
 const curMins=i*60+j;
 if(curMins<=startMins)continue;
 const displayH=i===24 ? 12:(i % 12||12);
 const ampm=i===24 ? "AM":(i>=12 ? "PM":"AM");
 const label=i===24 ? "12:00 AM(Midnight)":`${displayH}:${j===0?'00':'30'}${ampm}`;
 const opt=document.createElement("option");opt.value=`${i===24?'0':i}:${j===0?'00':'30'}`;opt.textContent=label;
 
 
 if(curMins>nextBookingStart){
 opt.disabled=true;
 opt.textContent+="(Conflict)";
}
 endSelect.appendChild(opt);
 if(!defaultSet&&curMins===startMins+30&&!opt.disabled){opt.selected=true;defaultSet=true;}
}
}
 validateBooking();
}
function validateBooking(){
 const btn=document.getElementById("submitBtn");
 const comments=document.getElementById("resComments").value.trim();
 let valid=!!(selectedAmenity&&selectedStart);
 if(selectedAmenity==="Guest Suite"){valid=valid&&!!selectedEnd&&(selectedEnd>selectedStart);}
 else{valid=valid&&document.getElementById("startTime").value!==""&&document.getElementById("endTime").value!=="";}
 if(selectedAmenity==="Social Lounge"){valid=valid&&comments.length>0;}
 btn.disabled=!valid;
}
function submitBooking(){
 const btn=document.getElementById("submitBtn");
 btn.disabled=true;btn.textContent="Processing...";
 const payload={
 action:"booking",amenity:selectedAmenity,startDate:toISODate(selectedStart),
 endDate:selectedEnd ? toISODate(selectedEnd):toISODate(selectedStart),
 startTime:document.getElementById("startTime").value||"",endTime:document.getElementById("endTime").value||"",
 firstName:currentUser.firstName,lastName:currentUser.lastName,email:currentUser.email,phone:currentUser.cellPhone||"",
 unit:currentUser.unit,comments:document.getElementById("resComments").value
};
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify(payload)})
 .then(res=>res.json()).then(data=>{
 if(data.success){
 btn.disabled=false;btn.textContent="Submit Request";
 toggleView('dashboard');
 prefetchDates();
 renderMyReservations();
 const banner=document.getElementById('inline-success');
 banner.style.display='block';
 banner.scrollIntoView({behavior:'smooth',block:'start'});
 
 setTimeout(()=>{
 document.addEventListener('click',function hideBanner(){
 banner.style.display='none';
 document.removeEventListener('click',hideBanner);
});
},100);
}
 else{alert("Error:"+data.message);btn.disabled=false;btn.textContent="Submit Request";}
});
}
function populateProfileFields(p){
 
 document.getElementById("view-unit").innerHTML=
 `Unit: ${p.unit||'Not set'}<br>Building: ${p.building||'Not set'}<br>Parking Spot(s): ${p.parking||'Not set'}`;
 
 document.getElementById("view-personal").innerHTML=
 `Email: ${p.email||'Not set'}<br>Cell: ${p.cellPhone||'Not set'}<br>Other: ${p.otherPhone||'Not set'}`;
 document.getElementById("profEmail").value=p.email||"";
 document.getElementById("profCell").value=p.cellPhone||"";
 document.getElementById("profOther").value=p.otherPhone||"";
 document.getElementById("profPass").value="";
 
 const ec=p.emergencyContacts||[];
 document.getElementById("view-emergency").innerHTML=ec.length
 ? ec.map(c=>`Name: ${c.name||'—'} | Phone: ${c.phone||'—'} | Relationship: ${c.relationship||'—'}`).join('<br>')
:'No emergency contacts added.';
 
 const veh=p.vehicles||[];
 document.getElementById("view-vehicles").innerHTML=veh.length
 ? veh.map(v=>`${v.year||''} ${v.make||''} ${v.model||''} | Color: ${v.color||'—'} | Plate: ${v.plate||'—'}`).join('<br>')
:'No vehicles added.';
 
 const n=p.notifications||{};
 document.getElementById("view-notifications").innerHTML=
 `Email Notifications: ${n.email ? 'On':'Off'}<br>Text Notifications: ${n.text ? 'On':'Off'}`;
 document.getElementById("notifEmail").checked=!!n.email;
 document.getElementById("notifText").checked=!!n.text;
 
 renderEmergencyList(ec);
 
 renderVehicleList(veh);
}
function renderEmergencyList(contacts){
 const list=document.getElementById("emergency-list");
 list.innerHTML="";
(contacts||[]).forEach((c,i)=>{
 const div=document.createElement("div");
 div.style="border:1px solid #eee;padding:10px;border-radius:4px;margin-bottom:10px;background:#fafafa;";
 div.innerHTML=`
<div class ="form-group" style="margin-bottom:8px;"><div><label>Name</label><input type="text" value="${c.name||''}" oninput="updateEC(${i},'name',this.value)"></div><div><label>Phone</label><input type="tel" value="${c.phone||''}" oninput="formatPhone(this);updateEC(${i},'phone',this.value)" onkeydown="phoneKeydown(this,event)"></div></div><label>Relationship</label><input type="text" value="${c.relationship||''}" oninput="updateEC(${i},'relationship',this.value)"><button type="button" onclick="removeEC(${i})" style="background:#c0392b;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-top:5px;">Remove</button>`;
 list.appendChild(div);
});
}
function renderVehicleList(vehicles){
 const list=document.getElementById("vehicles-list");
 list.innerHTML="";
(vehicles||[]).forEach((v,i)=>{
 const div=document.createElement("div");
 div.style="border:1px solid #eee;padding:10px;border-radius:4px;margin-bottom:10px;background:#fafafa;";
 div.innerHTML=`
<div class ="form-group" style="margin-bottom:8px;"><div><label>Make</label><input type="text" value="${v.make||''}" oninput="updateVeh(${i},'make',this.value)"></div><div><label>Model</label><input type="text" value="${v.model||''}" oninput="updateVeh(${i},'model',this.value)"></div></div><div class ="form-group" style="margin-bottom:8px;"><div><label>Color</label><input type="text" value="${v.color||''}" oninput="updateVeh(${i},'color',this.value)"></div><div><label>License Plate</label><input type="text" value="${v.plate||''}" oninput="updateVeh(${i},'plate',this.value)"></div></div><button type="button" onclick="removeVeh(${i})" style="background:#c0392b;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;margin-top:5px;">Remove</button>`;
 list.appendChild(div);
});
}
let workingEC=[];
let workingVeh=[];
function formatPhone(input){
 const digits=input.value.replace(/\D/g,'').slice(0,10);
 let formatted='';
 if(digits.length<=3){
 formatted=digits;
 if(digits.length===3)formatted+='-';
}else if(digits.length<=6){
 formatted=digits.slice(0,3)+'-'+digits.slice(3);
 if(digits.length===6)formatted+='-';
}else{
 formatted=digits.slice(0,3)+'-'+digits.slice(3,6)+'-'+digits.slice(6);
}
 input.value=formatted;
}
function phoneKeydown(input,e){
 if(e.key!=='Backspace')return ;
 const pos=input.selectionStart;
 const value=input.value;
 if(pos&&value[pos-1]==='-'){
 e.preventDefault();
 input.value=value.slice(0,pos-1)+value.slice(pos);
 input.setSelectionRange(pos-1,pos-1);
}
}
function addEmergencyContact(){
 workingEC.push({name:"",phone:"",relationship:""});
 renderEmergencyList(workingEC);
}
function removeEC(i){workingEC.splice(i,1);renderEmergencyList(workingEC);}
function updateEC(i,field,val){workingEC[i][field]=val;}
function addVehicle(){
 workingVeh.push({make:"",model:"",color:"",plate:""});
 renderVehicleList(workingVeh);
}
function removeVeh(i){workingVeh.splice(i,1);renderVehicleList(workingVeh);}
function updateVeh(i,field,val){workingVeh[i][field]=val;}
function saveLevel(level){
 const payload={action:"updateProfile",email:currentUser.email};
 
 const levelMap={personal:'personal',emergency:'emergency',vehicles:'vehicles',notifications:'notifications'};
 const editEl=document.getElementById(`edit-${level}`);
 const saveBtn=editEl ? editEl.querySelector('.save-btn'):null;
 if(saveBtn){saveBtn.disabled=true;saveBtn.textContent="Saving...";}
 if(level==='personal'){
 const newEmail=document.getElementById("profEmail").value.trim();
 if(newEmail&&newEmail!==currentUser.email)payload.newEmail=newEmail;
 payload.cellPhone=document.getElementById("profCell").value;
 payload.otherPhone=document.getElementById("profOther").value;
 const pass=document.getElementById("profPass").value;
 if(pass)payload.password=pass;
}
 if(level==='emergency'){
 payload.emergencyContacts=workingEC;
}
 if(level==='vehicles'){
 payload.vehicles=workingVeh;
}
 if(level==='notifications'){
 payload.notifications={
 email:document.getElementById("notifEmail").checked,
 text:document.getElementById("notifText").checked
};
}
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify(payload)}).then(res=>res.json()).then(data=>{
 if(saveBtn){saveBtn.disabled=false;saveBtn.textContent=saveBtn.dataset.label||saveBtn.textContent.replace("Saving...",saveBtn.dataset.origLabel||"Save");}
 if(data.success){
 currentUser=data.profile;
 sessionStorage.setItem("residentUser",JSON.stringify(currentUser));
 populateProfileFields(data.profile);
 toggleEdit(level);
}else{alert("Error saving. Please try again.");}
});
}
function toggleEdit(id){
 const el=document.getElementById(`edit-${id}`);
 const isOpening=el.style.display==='none';
 el.style.display=isOpening ? 'block':'none';
 if(isOpening&&id==='emergency'){workingEC=JSON.parse(JSON.stringify(currentUser.emergencyContacts||[]));renderEmergencyList(workingEC);}
 if(isOpening&&id==='vehicles'){workingVeh=JSON.parse(JSON.stringify(currentUser.vehicles||[]));renderVehicleList(workingVeh);}
}
function logout(){
 sessionStorage.removeItem("residentUser");
 currentUser=null;
 document.body.classList.remove("admin-mode");
 document.body.classList.remove("logged-in");
 document.getElementById("main-app-content").style.display="none";
 document.getElementById("admin-app-content").style.display="none";
 document.getElementById("library-view").style.display="none";
 var libContainer=document.getElementById("library-sections-container");
 if(libContainer) libContainer.innerHTML="";
 document.getElementById("login-container").style.display="block";
 document.getElementById("loginEmail").value="";
 document.getElementById("loginPassword").value="";
 document.getElementById("btnLogin").disabled=false;
 document.getElementById("btnLogin").textContent="Login";
 const snFab=document.getElementById("sn-fab");
 const snPanel=document.getElementById("sn-floating-panel");
 if(snFab) snFab.style.display="none";
 if(snPanel) snPanel.style.display="none";
 adminCloseSidebar();
}
let fdnStartDate=null;
let fdnEndDate=null;
let fdnStartMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
let fdnEndMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
function openFDN(){
 toggleView('fdn');
 loadFDNInstructions();
}
function openFDNForm(){
 document.getElementById("fdn-form-container").style.display="block";
 document.getElementById("fdnType").value="";
 document.getElementById("fdnText").value="";
 document.getElementById("fdnStartDisplay").value="";
 document.getElementById("fdnEndDisplay").value="";
 selectFDNExpires('none');document.getElementById("fdnEndDateWrap").style.display="none";
 document.getElementById("fdnStartCalWrap").style.display="none";
 document.getElementById("fdnEndCalWrap").style.display="none";
 fdnStartDate=null;fdnEndDate=null;
 fdnStartMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 fdnEndMonthDate=new Date(today.getFullYear(),today.getMonth(),1);
 fdnRenderCal("start");fdnRenderCal("end");
 document.getElementById("fdn-form-container").scrollIntoView({behavior:"smooth",block:"start"});
}
function cancelFDNForm(){
 document.getElementById("fdn-form-container").style.display="none";
}
function selectFDNExpires(val){
 const noBtn=document.getElementById("fdnOptNo");
 const onBtn=document.getElementById("fdnOptOn");
 document.getElementById("fdnExpiresToggleGroup").dataset.selected=val;
 if(val==='none'){
 noBtn.style.background='#2a3a55';noBtn.style.color='white';
 onBtn.style.background='white';onBtn.style.color='#bbb';
 document.getElementById("fdnEndDateWrap").style.display="none";
 fdnEndDate=null;document.getElementById("fdnEndDisplay").value="";
}else{
 onBtn.style.background='#2a3a55';onBtn.style.color='white';
 noBtn.style.background='white';noBtn.style.color='#bbb';
 document.getElementById("fdnEndDateWrap").style.display="block";
}
 document.getElementById("fdnEndCalWrap").style.display="none";
}
function toggleFDNCal(type){
 const wrap=document.getElementById(type==="start" ? "fdnStartCalWrap":"fdnEndCalWrap");
 const isOpen=wrap.style.display!=="none";
 
 document.getElementById("fdnStartCalWrap").style.display="none";
 document.getElementById("fdnEndCalWrap").style.display="none";
 if(!isOpen){wrap.style.display="block";fdnRenderCal(type);}
}
function fdnChangeMonth(type,dir){
 if(type==="start"){fdnStartMonthDate.setMonth(fdnStartMonthDate.getMonth()+dir);fdnRenderCal("start");}
 else{fdnEndMonthDate.setMonth(fdnEndMonthDate.getMonth()+dir);fdnRenderCal("end");}
}
function fdnRenderCal(type){
 const monthDate=type==="start" ? fdnStartMonthDate:fdnEndMonthDate;
 const gridId=type==="start" ? "fdnStartCalGrid":"fdnEndCalGrid";
 const labelId=type==="start" ? "fdnStartMonthLabel":"fdnEndMonthLabel";
 const selected=type==="start" ? fdnStartDate:fdnEndDate;
 const grid=document.getElementById(gridId);
 if(!grid)return ;
 grid.innerHTML="";
 document.getElementById(labelId).textContent=`${monthNames[monthDate.getMonth()]} ${monthDate.getFullYear()}`;
 const firstDay=new Date(monthDate.getFullYear(),monthDate.getMonth(),1).getDay();
 const daysInMonth=new Date(monthDate.getFullYear(),monthDate.getMonth()+1,0).getDate();
 for(let i=0;i<firstDay;i++)grid.appendChild(document.createElement("div"));
 for(let d=1;d<=daysInMonth;d++){
 const dateObj=new Date(monthDate.getFullYear(),monthDate.getMonth(),d);
 dateObj.setHours(0,0,0,0);
 const cell=document.createElement("div");
 cell.className="day";
 cell.textContent=d;
 if(selected&&+dateObj===+selected)cell.classList.add("selected");
 cell.addEventListener("click",()=>{
 if(type==="start"){
 fdnStartDate=dateObj;
 document.getElementById("fdnStartDisplay").value=fdnFormatDate(dateObj);
 document.getElementById("fdnStartCalWrap").style.display="none";
}else{
 fdnEndDate=dateObj;
 document.getElementById("fdnEndDisplay").value=fdnFormatDate(dateObj);
 document.getElementById("fdnEndCalWrap").style.display="none";
}
 fdnRenderCal(type);
});
 grid.appendChild(cell);
}
}
function fdnFormatDate(d){
 const mm=String(d.getMonth()+1).padStart(2,'0');
 const dd=String(d.getDate()).padStart(2,'0');
 return `${mm}/${dd}/${d.getFullYear()}`;
}
function saveFDNInstruction(){
 const type=document.getElementById("fdnType").value;
 const text=document.getElementById("fdnText").value.trim();
 const expiresOn=document.getElementById("fdnExpiresToggleGroup").dataset.selected==='on';
 if(!type){alert("Please select an Instruction Type.");return ;}
 if(!text){alert("Please enter your instructions.");return ;}
 if(!fdnStartDate){alert("Please select a Start Date.");return ;}
 if(expiresOn&&!fdnEndDate){alert("Please select an End Date.");return ;}
 const btn=document.getElementById("fdnSaveBtn");
 btn.disabled=true;btn.textContent="Saving...";
 const payload={
 action:"saveFrontDeskInstruction",
 email:currentUser.email,
 unit:currentUser.unit,
 firstName:currentUser.firstName,
 lastName:currentUser.lastName,
 instructionType:type,
 instructions:text,
 startDate:fdnFormatDate(fdnStartDate),
 endDate:expiresOn ? fdnFormatDate(fdnEndDate):"No Expiration"
};
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify(payload)})
 .then(res=>res.json()).then(data=>{
 btn.disabled=false;btn.textContent="Save Instruction";
 if(data.success){
 fdnCache=null;
 cancelFDNForm();
 loadFDNInstructions();
 const banner=document.getElementById("inline-success-fdn");
 banner.style.display="block";
 banner.scrollIntoView({behavior:"smooth",block:"start"});
 setTimeout(()=>{
 document.addEventListener("click",function hideFDNBanner(){
 banner.style.display="none";
 document.removeEventListener("click",hideFDNBanner);
});
},100);
}else{alert("Error saving instruction. Please try again.");}
});
}
function loadFDNInstructions(){
 const tbody=document.getElementById("fdn-table-body");
 if(fdnCache!==null){
 renderFDNTable(fdnCache,tbody);
 return ;
}
 tbody.innerHTML=`<tr><td colspan="3" class ="fdn-empty">Loading...</td></tr>`;
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({action:"getFrontDeskInstructions",email:currentUser.email})})
 .then(res=>res.json()).then(data=>{
 fdnCache=data.success ?(data.instructions||[]):[];
 renderFDNTable(fdnCache,tbody);
});
}
function renderFDNTable(instructions,tbody){
 if(!instructions||!instructions.length){
 tbody.innerHTML=`<tr><td colspan="4" class ="fdn-empty">No instructions submitted yet.</td></tr>`;
 return ;
}
 const todayStart=new Date();todayStart.setHours(0,0,0,0);
 
 const active=instructions.filter(r=>{
 if(!r.endDate||r.endDate==="No Expiration")return true;
 const d=new Date(r.endDate);
 if(isNaN(d))return true;
 const endUTC=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
 const todayUTC=new Date(Date.UTC(todayStart.getFullYear(),todayStart.getMonth(),todayStart.getDate()));
 return endUTC>=todayUTC;
});
 if(!active.length){
 tbody.innerHTML=`<tr><td colspan="4" class ="fdn-empty">No instructions submitted yet.</td></tr>`;
 return ;
}
 active.sort((a,b)=>new Date(b.startDate)-new Date(a.startDate));
 tbody.innerHTML=active.map(r=>`
<tr><td data-label="Effective Date">${fdnDisplayDate(r.startDate)}</td><td data-label="Type&amp;Instructions"><span class ="fdn-type-badge">${r.instructionType||'—'}</span><br><span style="font-size:13px;color:#444;margin-top:5px;display:block;">${r.instructions||''}</span></td><td data-label="End Date">${r.endDate==="No Expiration" ? "No Expiration":fdnDisplayDate(r.endDate)}</td><td style="text-align:center;white-space:nowrap;"><button onclick="removeFDNInstruction(${r.rowIndex},this)" style="background:none;border:none;cursor:pointer;padding:4px 8px;border-radius:4px;" title="Remove"><svg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='#c0392b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='3 6 5 6 21 6'/><path d='M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6'/><path d='M10 11v6'/><path d='M14 11v6'/><path d='M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2'/></svg></button></td></tr>`).join("");
}
function fdnDisplayDate(str){
 if(!str||str==="No Expiration")return str;
 
 
 const d=new Date(str);
 if(isNaN(d))return str;
 const mm=String(d.getUTCMonth()+1).padStart(2,'0');
 const dd=String(d.getUTCDate()).padStart(2,'0');
 const yyyy=d.getUTCFullYear();
 return `${mm}/${dd}/${yyyy}`;
}
function removeFDNInstruction(rowIndex,btn){
 
 const existing=document.querySelector(".fdn-confirm-row");
 if(existing)existing.remove();
 
 const tr=btn.closest("tr");
 const confirmRow=document.createElement("tr");
 confirmRow.className="fdn-confirm-row";
 confirmRow.innerHTML=`
<td colspan="4" style="background:#fff5f5;padding:10px 14px;border-top:1px solid #f5c6cb;"><span style="font-size:13px;color:#c0392b;font-weight:bold;">Remove this instruction?</span><span style="margin-left:12px;"><button onclick="confirmRemoveFDN(${rowIndex},this)" style="background:#c0392b;color:white;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;margin-right:6px;">Remove</button><button onclick="this.closest('.fdn-confirm-row').remove()" style="background:#eee;color:#555;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;">Cancel</button></span></td>`;
 tr.insertAdjacentElement("afterend",confirmRow);
}
function confirmRemoveFDN(rowIndex,btn){
 btn.disabled=true;btn.textContent="Removing...";
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({
 action:"deleteFrontDeskInstruction",
 email:currentUser.email,
 rowIndex:rowIndex
})})
 .then(res=>res.json()).then(data=>{
 if(data.success){
 fdnCache=null;
 loadFDNInstructions();
}else{
 btn.disabled=false;btn.textContent="Remove";
 const confirmRow=document.querySelector(".fdn-confirm-row");
 if(confirmRow)confirmRow.innerHTML=`<td colspan="4" style="background:#fff5f5;padding:10px 14px;color:#c0392b;font-size:13px;">Error removing instruction. Please try again.</td>`;
}
});
}
document.addEventListener("DOMContentLoaded",()=>{
 const saved=sessionStorage.getItem("residentUser");
 if(saved){
 initApp(JSON.parse(saved));
}else{
 
 
 
 fetch(WEB_APP_URL).catch(()=>{});
}
 
 const urlParams=new URLSearchParams(window.location.search);
 const resetToken=urlParams.get("token");
 if(resetToken)showResetPasswordScreen(resetToken);
});
let forgotModalMode=null;
function showForgotModal(mode){
 forgotModalMode=mode;
 const overlay=document.getElementById("forgot-modal-overlay");
 const title=document.getElementById("forgot-modal-title");
 const desc=document.getElementById("forgot-modal-desc");
 const input=document.getElementById("forgot-email-input");
 const msg=document.getElementById("forgot-modal-msg");
 const btn=document.getElementById("forgot-submit-btn");
 title.textContent=mode==='password' ? "Forgot Password":"Forgot Username";
 desc.textContent=mode==='password'
 ? "Enter the email address you have on file with Property Management. We'll send you a link to reset your password."
:"Enter the email address you have on file with Property Management. We'll send you a reminder of your username.";
 input.value="";
 msg.style.display="none";
 btn.disabled=false;
 btn.textContent="Send Email";
 overlay.style.display="flex";
 setTimeout(()=>input.focus(),100);
}
function closeForgotModal(){
 document.getElementById("forgot-modal-overlay").style.display="none";
 forgotModalMode=null;
}
document.getElementById("forgot-modal-overlay").addEventListener("click",function(e){
 if(e.target===this)closeForgotModal();
});
document.getElementById("forgot-email-input").addEventListener("keypress",function(e){
 if(e.key==="Enter")submitForgot();
});
function submitForgot(){
 const email=document.getElementById("forgot-email-input").value.trim();
 const btn=document.getElementById("forgot-submit-btn");
 if(!email){
 showForgotMsg("error","Please enter your email address.");
 return ;
}
 btn.disabled=true;
 btn.textContent="Sending...";
 const action=forgotModalMode==='password' ? "forgotPassword":"forgotUsername";
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({action:action,email:email})})
 .then(res=>res.json())
 .then(data=>{
 if(data.success){
 btn.textContent="Sent ✓";
 if(forgotModalMode==='password'){
 showForgotMsg("success","A password reset link has been sent to "+email+". Please check your inbox(and spam folder).");
}else{
 showForgotMsg("success","A username reminder has been sent to "+email+". Please check your inbox(and spam folder).");
}
}else{
 btn.disabled=false;
 btn.textContent="Send Email";
 showForgotMsg("error",data.message||"Something went wrong. Please try again.");
}
})
 .catch(()=>{
 btn.disabled=false;
 btn.textContent="Send Email";
 showForgotMsg("error","Something went wrong. Please try again.");
});
}
function showForgotMsg(type,text){
 const msg=document.getElementById("forgot-modal-msg");
 msg.textContent=text;
 msg.style.display="block";
 if(type==="success"){
 msg.style.background="#e6f4ea";
 msg.style.color="#276221";
 msg.style.border="1px solid #b7dfb8";
}else{
 msg.style.background="#fde8e8";
 msg.style.color="#c0392b";
 msg.style.border="1px solid #f5c6cb";
}
}
function showResetPasswordScreen(token){
 
 document.getElementById("login-container").style.display="none";
 const resetDiv=document.createElement("div");
 resetDiv.id="reset-container";
 resetDiv.style.cssText="max-width:400px;margin:60px auto;padding:30px;border:1px solid #ddd;border-radius:12px;background:#fff;text-align:center;box-shadow:0 4px 15px rgba(0,0,0,0.10);";
 resetDiv.innerHTML=`
<h2 style="color:#2a3a55;margin:0 0 6px 0;">RESIDENT LOGIN</h2><p style="color:#666;font-size:14px;margin:0 0 22px 0;">Choose a new password for your account.</p><div id="reset-msg" style="display:none;padding:10px 14px;border-radius:6px;font-size:13px;font-weight:bold;margin-bottom:14px;"></div><div id="reset-form-body"><label style="font-weight:bold;font-size:14px;display:block;text-align:left;margin-bottom:5px;">New Password</label><input type="password" id="reset-new -pw" placeholder="Enter new password" style="width:100%;padding:12px;font-size:15px;border:1px solid #ccc;border-radius:8px;margin-bottom:14px;box-sizing:border-box;"><label style="font-weight:bold;font-size:14px;display:block;text-align:left;margin-bottom:5px;">Confirm Password</label><input type="password" id="reset-confirm-pw" placeholder="Confirm new password" style="width:100%;padding:12px;font-size:15px;border:1px solid #ccc;border-radius:8px;margin-bottom:18px;box-sizing:border-box;"><button id="reset-submit-btn" onclick="submitResetPassword('${token}')" style="width:100%;padding:13px;background:#2a3a55;color:white;border:none;border-radius:25px;cursor:pointer;font-size:15px;font-weight:bold;">Save New Password</button></div>`;
 document.body.insertBefore(resetDiv,document.getElementById("main-app-content"));
 
 resetDiv.addEventListener("keypress",function(e){
 if(e.key==="Enter")submitResetPassword(token);
});
}
function submitResetPassword(token){
 const newPw=document.getElementById("reset-new -pw").value;
 const confirmPw=document.getElementById("reset-confirm-pw").value;
 const btn=document.getElementById("reset-submit-btn");
 if(!newPw||newPw.length<6){
 showResetMsg("error","Password must be at least 6 characters.");
 return ;
}
 if(newPw!==confirmPw){
 showResetMsg("error","Passwords do not match. Please try again.");
 return ;
}
 btn.disabled=true;
 btn.textContent="Saving...";
 fetch(WEB_APP_URL,{method:"POST",body:JSON.stringify({action:"resetPassword",token:token,newPassword:newPw})})
 .then(res=>res.json())
 .then(data=>{
 if(data.success){
 document.getElementById("reset-form-body").style.display="none";
 showResetMsg("success","✓ Your password has been updated!You can now log in with your new password.");
 setTimeout(()=>{
 document.getElementById("reset-container").style.display="none";
 document.getElementById("login-container").style.display="block";
 
 window.history.replaceState({},document.title,window.location.pathname);
},2500);
}else{
 btn.disabled=false;
 btn.textContent="Save New Password";
 showResetMsg("error",data.message||"Something went wrong. Please request a new reset link.");
}
})
 .catch(()=>{
 btn.disabled=false;
 btn.textContent="Save New Password";
 showResetMsg("error","Something went wrong. Please try again.");
});
}
function showResetMsg(type,text){
 const msg=document.getElementById("reset-msg");
 msg.textContent=text;
 msg.style.display="block";
 if(type==="success"){
 msg.style.background="#e6f4ea";
 msg.style.color="#276221";
 msg.style.border="1px solid #b7dfb8";
}else{
 msg.style.background="#fde8e8";
 msg.style.color="#c0392b";
 msg.style.border="1px solid #f5c6cb";
}
}
const BB_URL=WEB_APP_URL;
const BB_VALID_CATEGORIES=["Market Place","Help Needed/Offered","Topics","Announcements","Activity Partners","Recommendations"];
let bbPostsCache=[];
let bbCacheLoaded=false;
let bbCategory="Recent Posts";
let bbLoading=false;
let bbNewPostIds=new Set();
let bbExpiryInterval=null;
let bbLastFetchTime=0;
function openBulletinBoard(){
 toggleView('bulletin');
 
 if(bbExpiryInterval)clearInterval(bbExpiryInterval);
 bbExpiryInterval=setInterval(()=>{
 if(bbCacheLoaded&&bbPruneExpired()){
 bbUpdateSidebarBadges();
 bbRenderPosts();
}
},60000);
 
 bbCategory="Recent Posts";
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 item.classList.toggle("active",item.dataset.cat==="Recent Posts");
});
 document.getElementById("bb-section-title").textContent="Recent Posts";
 document.getElementById("bb-mobile-title").textContent="Recent Posts";
 bbCloseForm();
 
 
 const cacheAge=Date.now()-bbLastFetchTime;
 if(bbCacheLoaded&&cacheAge<5*60*1000){
 bbRenderPosts();
}else{
 bbCacheLoaded=false;
 bbFetchAndRender();
}
}
document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 item.addEventListener("click",()=>{
 const cat=item.dataset.cat;
 bbCategory=cat;
 document.querySelectorAll(".bb-sidebar-item").forEach(s=>{
 s.classList.toggle("active",s.dataset.cat===cat);
});
 document.getElementById("bb-section-title").textContent=cat;
 document.getElementById("bb-mobile-title").textContent=cat;
 
 document.getElementById("bb-sidebar").classList.remove("bb-open");
 document.getElementById("bb-menu-overlay").classList.remove("bb-open");
 
 if(bbCacheLoaded){
 bbRenderPosts();
}else{
 bbFetchAndRender();
}
});
});
 document.getElementById("bb-hamburger-btn").addEventListener("click",()=>{
 document.getElementById("bb-sidebar").classList.toggle("bb-open");
 document.getElementById("bb-menu-overlay").classList.toggle("bb-open");
});
 document.getElementById("bb-menu-overlay").addEventListener("click",()=>{
 document.getElementById("bb-sidebar").classList.remove("bb-open");
 document.getElementById("bb-menu-overlay").classList.remove("bb-open");
});
 
 document.getElementById("bb-modal").addEventListener("click",function(e){
 if(e.target===this)bbCloseModal();
});
});
function bbResetToHome(){
 bbCategory="Recent Posts";
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 item.classList.toggle("active",item.dataset.cat==="Recent Posts");
});
 document.getElementById("bb-section-title").textContent="Recent Posts";
 document.getElementById("bb-mobile-title").textContent="Recent Posts";
 bbRenderPosts();
}
function bbOnCategoryChange(){
 const cat=document.getElementById("bb-new-cat").value;
 document.getElementById("bb-price-wrap").style.display=(cat==="Market Place")? "block":"none";
 if(cat!=="Market Place")document.getElementById("bb-new-price").value="";
}
function bbEnforcePrice(){
 const input=document.getElementById("bb-new-price");
 let val=input.value;
 if(val&&!val.startsWith("$"))input.value="$"+val;
}
async function bbFetchAndRender(){
 if(bbLoading)return ;
 bbLoading=true;
 document.getElementById("bb-posts-container").innerHTML=`<div class="bb-empty">Loading posts...</div>`;
 const slowTimer=setTimeout(()=>{
 const el=document.getElementById("bb-posts-container");
 if(el&&el.innerHTML.includes("Loading posts")){
 el.innerHTML=`<div class="bb-empty">Loading posts...<br><span style="font-size:12px;color:#aaa;">(Server warming up,please wait a moment)</span></div>`;
}
},5000);
 try{
 const controller=new AbortController();
 const timeoutId=setTimeout(()=>controller.abort(),30000);
 const res=await fetch(BB_URL,{
 method:"POST",
 body:JSON.stringify({action:"getBulletinPosts"}),
 signal:controller.signal
});
 clearTimeout(timeoutId);
 if(!res.ok)throw new Error("Server error:"+res.status);
 const json=await res.json();
 
 if(json&&json.error)throw new Error("Backend error:"+json.error);
 const posts=Array.isArray(json)? json:[];
 const now=new Date();
 bbPostsCache=posts
 .filter(p=>p.id&&p.category&&p.title)
 .filter(p=>!p.expiresAt||new Date(p.expiresAt)>now)
 .sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
 bbCacheLoaded=true;
 bbLastFetchTime=Date.now();
}catch(e){
 clearTimeout(slowTimer);
 bbLoading=false;
 document.getElementById("bb-posts-container").innerHTML=
 `<div class="bb-empty" style="color:#c0392b;">Could not load posts. Please try again.<br><br>`+
 `<button onclick="bbFetchAndRender()" style="background:#2a3a55;color:white;border:none;padding:9px 20px;border-radius:20px;cursor:pointer;font-weight:bold;">Retry</button></div>`;
 return ;
}
 clearTimeout(slowTimer);
 bbLoading=false;
 bbUpdateSidebarBadges();
 bbRenderPosts();
}
function bbUpdateSidebarBadges(){
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 const cat=item.dataset.cat;
 const baseText=item.textContent.replace(/\s*\(\d+\)\s*$/,"").trim();
 const count=(cat==="Recent Posts")
 ? bbPostsCache.length
:bbPostsCache.filter(p=>p.category===cat).length;
 item.innerHTML=count>0
 ? `${baseText}<span style="font-weight:normal;">(${count})</span>`
:baseText;
});
}
function bbPruneExpired(){
 
 
 const now=new Date();
 const before=bbPostsCache.length;
 bbPostsCache=bbPostsCache.filter(p=>!p.expiresAt||new Date(p.expiresAt)>now);
 return bbPostsCache.length<before;
}
function bbRenderPosts(){
 bbPruneExpired();
 const container=document.getElementById("bb-posts-container");
 const activeCat=bbCategory;
 let posts;
 if(activeCat==="Recent Posts"){
 posts=bbPostsCache;
}else{
 posts=bbPostsCache.filter(p=>p.category===activeCat);
}
 if(!posts.length){
 container.innerHTML=`<div class="bb-empty">No posts in "${activeCat}" yet.</div>`;
 return ;
}
 const frag=document.createDocumentFragment();
 posts.forEach(post=>{
 const div=document.createElement("div");
 div.className="bb-post";
 const time=new Date(post.createdAt).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
 const priceHtml=post.price ? `<span style="font-weight:normal;">(${escapeHtml(formatPrice(post.price))})</span>`:"";
 const isOwner=currentUser&&post.authorID===`${currentUser.firstName}${currentUser.lastName}(Unit ${currentUser.unit})`;
 div.innerHTML=`
<div style="display:flex;gap:8px;align-items:flex-start;"><div style="flex:1;min-width:0;"><h4>${escapeHtml(post.title)}${priceHtml}<span class="bb-post-cat" data-cat="${escapeHtml(post.category)}">[${escapeHtml(post.category)}]</span></h4><div class="bb-post-preview">${escapeHtml(post.content)}</div></div>${post.photoData?`<img src="${post.photoData}" class="bb-post-thumb" alt="photo" onclick="event.stopPropagation();bbOpenModal(this._post)">`:''}  </div><div class="bb-post-footer"><div class="bb-post-meta">By ${escapeHtml(post.authorID)}· ${time}</div>
 ${isOwner ? `<button class="bb-delete-btn" title="Remove my post"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c0392b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg></button>`:''}
</div></div>
 ${isOwner ? `<div class="bb-delete-confirm" id="bb-del-confirm-${escapeHtml(post.id)}" style="display:none;">Remove this post permanently?<button onclick="bbConfirmDelete('${escapeHtml(post.id)}','${escapeHtml(post.authorID)}',this)" style="background:#c0392b;color:white;">Remove</button><button onclick="document.getElementById('bb-del-confirm-${escapeHtml(post.id)}').style.display='none'" style="background:#eee;color:#555;">Cancel</button></div>`:""}`;
 const thumbImg=div.querySelector('.bb-post-thumb');if(thumbImg)thumbImg._post=post;
div.querySelector(".bb-post-cat").addEventListener("click",e=>{
 e.stopPropagation();
 bbCategory=post.category;
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 item.classList.toggle("active",item.dataset.cat===post.category);
});
 document.getElementById("bb-section-title").textContent=post.category;
 document.getElementById("bb-mobile-title").textContent=post.category;
 bbRenderPosts();
});
 if(isOwner){
 div.querySelector(".bb-delete-btn").addEventListener("click",e=>{
 e.stopPropagation();
 
 document.querySelectorAll(".bb-delete-confirm").forEach(el=>el.style.display="none");
 document.getElementById(`bb-del-confirm-${post.id}`).style.display="flex";
});
}
 div.addEventListener("click",e=>{
 if(!e.target.classList.contains("bb-post-cat")&&!e.target.classList.contains("bb-delete-btn")&&!e.target.closest(".bb-delete-confirm")){
 bbOpenModal(post);
}
});
 frag.appendChild(div);
});
 container.innerHTML="";
 container.appendChild(frag);
}
let bbModalCurrentPost=null;
function bbOpenModal(post){
 bbModalCurrentPost=post;
 const time=new Date(post.createdAt).toLocaleString([],{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true});
 const catEl=document.getElementById("bb-modal-cat");
 catEl.textContent=`[${post.category}]`;
 catEl.onclick=()=>{
 bbCategory=post.category;
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
 item.classList.toggle("active",item.dataset.cat===post.category);
});
 document.getElementById("bb-section-title").textContent=post.category;
 document.getElementById("bb-mobile-title").textContent=post.category;
 bbRenderPosts();
 bbCloseModal();
};
 const modalTitleEl=document.getElementById("bb-modal-title");
 modalTitleEl.innerHTML=escapeHtml(post.title)+(post.price ? `<span style="font-weight:normal;font-size:0.85em;">(${escapeHtml(formatPrice(post.price))})</span>`:"");
 document.getElementById("bb-modal-body").textContent=post.content;
 const modalPhoto=document.getElementById("bb-modal-photo");
 if(post.photoData){
 modalPhoto.src=post.photoData;
 modalPhoto.style.display="block";
}else{
 modalPhoto.src="";
 modalPhoto.style.display="none";
}
 document.getElementById("bb-modal-footer").textContent=`Posted by ${post.authorID}· ${time}`;
 
 const isOwner=currentUser&&post.authorID===`${currentUser.firstName}${currentUser.lastName}(Unit ${currentUser.unit})`;
 const deleteWrap=document.getElementById("bb-modal-delete-wrap");
 const deleteConfirm=document.getElementById("bb-modal-delete-confirm");
 deleteWrap.style.display=isOwner ? "block":"none";
 deleteConfirm.style.display="none";
 
 const emailWrap=document.getElementById("bb-modal-email-wrap");
 const emailLink=document.getElementById("bb-email-poster-link");
 if(!isOwner&&post.authorEmail){
 const senderName=currentUser ? `${currentUser.firstName}${currentUser.lastName}`:"Resident";
 const senderUnit=currentUser ? currentUser.unit:"";
 const subject=encodeURIComponent(post.title);
 const body=encodeURIComponent(`\n\n\nSent from :\n${senderName},Unit ${senderUnit}`);
 emailLink.href=`mailto:${post.authorEmail}?subject=${subject}&body=${body}`;
 
 const posterName=post.authorID ? post.authorID.replace(/\s*\(Unit[^)]*\)\s*$/i,"").trim():"Poster";
 emailLink.textContent=`✉ Email ${posterName}`;
 emailWrap.style.display="block";
}else{
 emailWrap.style.display="none";
}
 document.getElementById("bb-modal").style.display="flex";
}
function bbModalDeleteClick(){
 const confirm=document.getElementById("bb-modal-delete-confirm");
 confirm.style.display=confirm.style.display==="none" ? "flex":"none";
}
async function bbConfirmModalDelete(){
 if(!bbModalCurrentPost)return ;
 await bbDeletePost(bbModalCurrentPost.id,bbModalCurrentPost.authorID);
 bbCloseModal();
}
function bbCloseModal(){
 document.getElementById("bb-modal").style.display="none";
 bbModalCurrentPost=null;
}
async function bbConfirmDelete(postId,authorID,btn){
 btn.disabled=true;
 btn.textContent="Removing...";
 await bbDeletePost(postId,authorID);
}
async function bbDeletePost(postId,authorID){
 try{
 const res=await fetch(BB_URL,{
 method:"POST",
 body:JSON.stringify({action:"deleteBulletinPost",id:postId,authorID:authorID})
});
 const data=await res.json();
 if(data.success){
 
 bbPostsCache=bbPostsCache.filter(p=>p.id!==String(postId));
 bbUpdateSidebarBadges();
 bbRenderPosts();
 bbToast("Post removed.","success");
}else{
 bbToast("Could not remove post:"+(data.message||"Please try again."),"error");
}
}catch(e){
 bbToast("Error removing post. Please try again.","error");
}
}
function bbOpenForm(){
 const form=document.getElementById("bb-post-form");
 form.style.display=form.style.display==="none" ? "block":"none";
 if(form.style.display==="block"){
 const catSelect=document.getElementById("bb-new-cat");
 catSelect.value=(bbCategory!=="Recent Posts"&&BB_VALID_CATEGORIES.includes(bbCategory))? bbCategory:"";
 document.getElementById("bb-new-title").value="";
 document.getElementById("bb-new-body").value="";
 document.getElementById("bb-new-price").value="";
 document.getElementById("bb-new-duration").value="14";
 document.getElementById("bb-price-wrap").style.display=(catSelect.value==="Market Place")? "block":"none";
 bbRemovePhoto(null);
 form.scrollIntoView({behavior:"smooth",block:"start"});
}
}
function bbCloseForm(){
 const form=document.getElementById("bb-post-form");
 if(form)form.style.display="none";
 const priceWrap=document.getElementById("bb-price-wrap");
 if(priceWrap)priceWrap.style.display="none";
 bbRemovePhoto(null);
}
let _bbPhotoData='';
function bbPhotoSelected(input){
 const file=input.files[0];
 if(!file)return;
 if(!file.type.startsWith('image/')){bbToast('Please select an image file.','error');input.value='';return;}
 if(file.size>5*1024*1024){bbToast('Photo must be under 5 MB.','error');input.value='';return;}
 const reader=new FileReader();
 reader.onload=function(e){
  _bbPhotoData=e.target.result;
  window._bbPhotoData=_bbPhotoData;
  const prev=document.getElementById('bb-photo-preview');
  document.getElementById('bb-photo-thumb').src=_bbPhotoData;
  prev.style.display='block';
  document.getElementById('bb-photo-zone').style.borderColor='#2a3a55';
 };
 reader.readAsDataURL(file);
}
function bbRemovePhoto(e){
 if(e)e.preventDefault();
 _bbPhotoData='';
 window._bbPhotoData='';
 const input=document.getElementById('bb-photo-input');
 if(input)input.value='';
 const prev=document.getElementById('bb-photo-preview');
 if(prev){prev.style.display='none';document.getElementById('bb-photo-thumb').src='';}
 const zone=document.getElementById('bb-photo-zone');
 if(zone)zone.style.borderColor='';
}
async function bbSubmitPost(){
 const cat=document.getElementById("bb-new-cat").value.trim();
 const title=document.getElementById("bb-new-title").value.trim();
 const body=document.getElementById("bb-new-body").value.trim();
 let priceRaw=document.getElementById("bb-new-price").value.trim();
 if(priceRaw&&!priceRaw.startsWith("$"))priceRaw="$"+priceRaw;
 const durationDays=parseInt(document.getElementById("bb-new-duration").value)||14;
 if(!cat){bbToast("Please select a category.","error");return ;}
 if(cat==="Market Place"&&!priceRaw){bbToast("Please enter a price for your Market Place post.","error");return ;}
 if(!title){bbToast("Please enter a title.","error");return ;}
 if(!body){bbToast("Please enter a message.","error");return ;}
 const btn=document.getElementById("bb-submit-btn");
 btn.disabled=true;btn.textContent="Posting...";
 const authorID=currentUser ? `${currentUser.firstName}${currentUser.lastName}(Unit ${currentUser.unit})`:"Resident";
 const expireDays=Math.min(durationDays,30);
 const expiresAt=new Date(Date.now()+expireDays*24*60*60*1000).toISOString();
 const authorEmail=currentUser ? currentUser.email:"";
 const newPost={
 action:"saveBulletinPost",
 id:Date.now().toString(),
 title,
 content:body,
 category:cat,
 price:(cat==="Market Place"&&priceRaw)? priceRaw:"",
 authorID,
 authorEmail,
 createdAt:new Date().toISOString(),
 expiresAt,
 photoData:window._bbPhotoData||''
};
 try{
 const res=await fetch(BB_URL,{method:"POST",body:JSON.stringify(newPost)});
 const data=await res.json();
 if(data.status==="success"){
 const savedId=(data.post&&data.post.id)? String(data.post.id):String(newPost.id);
 bbNewPostIds.add(savedId);
 
 bbPostsCache=[];
 bbCacheLoaded=false;
 bbCloseForm();
 
 bbCategory=cat;
 document.querySelectorAll(".bb-sidebar-item").forEach(item=>{
item.classList.toggle("active",item.dataset.cat===cat);
});
 document.getElementById("bb-section-title").textContent=cat;
 document.getElementById("bb-mobile-title").textContent=cat;
 await bbFetchAndRender();
 bbToast("✓ Post shared successfully!","success");
}else{
 bbToast("Error posting:"+(data.message||"Please try again."),"error");
}
}catch(e){
 bbToast("Error posting. Please try again.","error");
}
 btn.disabled=false;btn.textContent="Post";
}
const ADMIN_PANELS=['home','requests','reservations','packages','notes','fdn','residents','communications','library'];
function adminNavigate(panelId,navItem){
 
 ADMIN_PANELS.forEach(id=>{
 const el=document.getElementById('admin-panel-'+id);
 if(el)el.style.display='none';
});
 
 const target=document.getElementById('admin-panel-'+panelId);
 if(target)target.style.display='block';
 
 document.querySelectorAll('.admin-nav-item').forEach(el=>el.classList.remove('active'));
 if(navItem)navItem.classList.add('active');
 
 adminCloseSidebar();
 
 setTimeout(()=>{document.getElementById('page-top').scrollIntoView({behavior:'smooth',block:'start'});},30);
 
 var fdnHomePanel=document.getElementById('admin-home-fdn-panel');
 if(fdnHomePanel)fdnHomePanel.style.display='none';
 if(panelId==='home')adminLoadHomeStats();
 if(panelId==='requests')adminLoadRequests();
 if(panelId==='reservations')adminLoadReservations();
 if(panelId==='notes')staffNotesAdminLoad();
 if(panelId==='residents')resMgmtLoad();
 if(panelId!=='residents')resMgmtReset();
 if(panelId==='communications')commPanelInit();
 if(panelId==='fdn')fdnAdminLoad();
 if(panelId==='library')libAdminLoad();
}
function adminToggleSidebar(){
 document.getElementById('admin-sidebar').classList.toggle('admin-open');
 document.getElementById('admin-sidebar-overlay').classList.toggle('admin-open');
}
function adminCloseSidebar(){
 document.getElementById('admin-sidebar')?.classList.remove('admin-open');
 document.getElementById('admin-sidebar-overlay')?.classList.remove('admin-open');
}
function adminLoadHomeStats(){
 
 fetch(WEB_APP_URL,{
 method:"POST",
 redirect:"follow",
 body:JSON.stringify({action:"getTodayReservationsCount"})
})
 .then(r=>r.text())
 .then(text=>{
 try{
 const data=JSON.parse(text);
 if(!data.success)return ;
 const statToday=document.getElementById("stat-today");
 if(statToday)statToday.textContent=data.count ?? 0;
}catch(e){}
})
 .catch(()=>{});
 
 fetch(WEB_APP_URL,{
 method:"POST",
 redirect:"follow",
 body:JSON.stringify({action:"getPendingRequests"})
})
 .then(r=>r.text())
 .then(text=>{
 try{
 const data=JSON.parse(text);
 if(!data.success)return ;
 const count=(data.requests||[]).length;
 const el=document.getElementById("stat-pending");
 if(el)el.textContent=count;
 adminUpdateRequestBadge(count);
 
 adminRequestsData=data.requests||[];
 _adminReqCache={ts:Date.now(),requests:adminRequestsData};
}catch(e){}
})
 .catch(()=>{});
 
 
  fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getTodaysFDN'})})
  .then(function(r){return r.json();})
  .then(function(data){
    var allItems=data.instructions||[];
    var statEl=document.getElementById('stat-fdn');
    if(statEl){
      var now=new Date();
      var todayUTC=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));
      var activeCount=allItems.filter(function(r){
        if(!r.endDate||r.endDate==='No Expiration')return false;
        var d=new Date(r.endDate);
        if(isNaN(d))return false;
        var endUTC=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));
        return endUTC>=todayUTC;
      }).length;
      statEl.textContent=activeCount;
    }
    var panel=document.getElementById('admin-home-fdn-panel');
    var body=document.getElementById('admin-home-fdn-body');
    if(!panel||!body)return;
    // Only show the FDN panel if we're still on the Dashboard Home panel
    if(document.getElementById('admin-panel-home').style.display==='none')return;
    // Exclude No Expiration items
    var items=allItems.filter(function(r){
      return r.endDate && r.endDate!=='No Expiration';
    });
    if(!items.length){panel.style.display='none';return;}
    panel.style.display='';
    // Sort: end date soonest first, then unit number smallest first
    items.sort(function(a,b){
      var da=new Date(a.endDate), db=new Date(b.endDate);
      if(da-db!==0)return da-db;
      var ua=parseFloat(a.unit)||0, ub=parseFloat(b.unit)||0;
      if(ua!==ub)return ua-ub;
      return String(a.unit||'').localeCompare(String(b.unit||''));
    });
    // Build collapsible header (wire once)
    var hdr=document.getElementById('admin-home-fdn-header');
    var chev=document.getElementById('admin-home-fdn-chevron');
    if(hdr&&chev&&!hdr.dataset.wired){
      hdr.dataset.wired='1';
      hdr.onclick=function(){
        var collapsed=body.style.display==='none';
        body.style.display=collapsed?'':'none';
        chev.textContent=collapsed?'▲':'▼';
      };
    }
    var rows=items.map(function(r){
      var name=escapeHtml(((r.firstName||'')+' '+(r.lastName||'')).trim())||'—';
      var endLabel=fdnDisplayDate(r.endDate);
      return '<div style="display:flex;align-items:flex-start;gap:14px;padding:12px 18px;border-bottom:1px solid #eef0f3;">'
        +'<div style="background:#e07b00;color:white;font-size:11px;font-weight:bold;border-radius:6px;padding:3px 9px;white-space:nowrap;margin-top:2px;">Unit '+escapeHtml(String(r.unit||'—'))+'</div>'
        +'<div style="flex:1;"><div style="font-weight:600;font-size:13px;"><a href="#" onclick="adminNavigate(\'residents\',document.querySelector(\'[data-panel=residents]\'));setTimeout(function(){resMgmtOpenProfile(\''+escapeHtml(r.email||'')+'\')},400);return false;" style="color:#2a3a55;text-decoration:none;">'+name+'</a> <span class="fdn-type-badge" style="margin-left:6px;">'+escapeHtml(r.instructionType||'—')+'</span></div>'
        +'<div style="font-size:12px;color:#555;margin-top:3px;">'+escapeHtml(r.instructions||'')+'</div>'
        +'<div style="font-size:11px;color:#999;margin-top:3px;">Effective: '+fdnDisplayDate(r.startDate)+' — Expires: '+endLabel+'</div>'
        +'</div></div>';
    }).join('');
    body.innerHTML=rows+'<div style="padding:10px 18px;"><button onclick="adminNavigate(\'fdn\',document.querySelector(\'[data-panel=fdn]\'))" style="background:none;border:none;color:#2a3a55;font-size:13px;font-weight:bold;cursor:pointer;padding:0;">View all →</button></div>';
  }).catch(function(){});

 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({action:"getAdminReservations"})
})
 .then(r=>r.json())
 .then(data=>{
 if(!data.success)return ;
 adminReservationsData=data.reservations||[];
 _adminResCache={ts:Date.now(),reservations:adminReservationsData};
})
 .catch(()=>{});
}
function adminFmtDate(val){
 if(!val)return "";
 const d=new Date(val);
 if(isNaN(d.getTime()))return String(val);
 return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
}
function adminFmtTime(val){
 if(!val)return "";
 
 if(typeof val==="string"&&/[AP]M/i.test(val))return val;
 
 const d=new Date(val);
 if(!isNaN(d.getTime())){
 return d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"});
}
 return String(val);
}
function adminDateRange(start,end,amenity){
 const s=adminFmtDate(start);
 const e=adminFmtDate(end);
 if(!e||e===s)return s;
 return s+" – "+e;
}
function adminTimeRange(startTime,endTime,amenity){
 if(amenity==="Guest Suite")return "Check-in 3:00 PM/Check-out 11:00 AM";
 const s=adminFmtTime(startTime);
 const e=adminFmtTime(endTime);
 if(s&&e)return s+" – "+e;
 return s||e||"";
}
let adminRequestsData=[];
let _adminReqCache=null;
const ADMIN_REQ_TTL_MS=90_000;
function adminLoadRequests(forceRefresh){
 
 
 
 
 
 const now=Date.now();
 const cacheAge=_adminReqCache ?(now-_adminReqCache.ts):Infinity;
 const useCached=!forceRefresh&&_adminReqCache&&cacheAge<ADMIN_REQ_TTL_MS;
 if(useCached){
 adminRequestsData=_adminReqCache.requests;
 adminRenderRequests();
 adminUpdateRequestBadge(adminRequestsData.length);
}else{
 document.getElementById("requests-body").innerHTML='<div class ="admin-loading">Loading requests…</div>';
}
 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({action:"getPendingRequests"})
})
 .then(r=>r.json())
 .then(data=>{
 if(!data.success){
 if(!useCached){
 document.getElementById("requests-body").innerHTML='<div class ="admin-empty">Could not load requests. Please try again.</div>';
}
 return ;
}
 adminRequestsData=data.requests||[];
 _adminReqCache={ts:Date.now(),requests:adminRequestsData};
 adminRenderRequests();
 adminUpdateRequestBadge(adminRequestsData.length);
 
 const el=document.getElementById("stat-pending");
 if(el)el.textContent=adminRequestsData.length;
})
 .catch(()=>{
 if(!useCached){
 document.getElementById("requests-body").innerHTML='<div class ="admin-empty">Network error. Please try again.</div>';
}
});
}
function adminRenderRequests(){
 const container=document.getElementById("requests-body");
 if(adminRequestsData.length===0){
 container.innerHTML='<div class ="admin-empty">✅ No pending requests — you\'re all caught up!</div>';
 return ;
}
 let html='<div class ="admin-table-wrap"><table class ="admin-table">';
 html+='<thead><tr>'
+'<th>Amenity</th>'
+'<th>Resident</th>'
+'<th>Unit</th>'
+'<th>Date(s)</th>'
+'<th>Time</th>'
+'<th>Submitted</th>'
+'<th class ="col-actions">Actions</th>'
+'</tr></thead><tbody>';
 adminRequestsData.forEach(req=>{
 const dateRange=adminDateRange(req.startDate,req.endDate,req.amenity);
 const timeRange=adminTimeRange(req.startTime,req.endTime,req.amenity);
 const submitted=adminFmtDate(req.timestamp);
 const name=escapeHtml((req.firstName||"")+" "+(req.lastName||"")).trim();
 const rowKey=escapeHtml(req.rowIndex+"|"+req.email+"|"+req.amenity+"|"+req.startDate);
 html+=`<tr><td><strong>${escapeHtml(req.amenity)}</strong></td><td>${escapeHtml(name)}</td><td>${escapeHtml(String(req.unit||""))}</td><td>${escapeHtml(dateRange)}</td><td style="white-space:nowrap;">${escapeHtml(timeRange)}</td><td style="white-space:nowrap;">${escapeHtml(submitted)}</td><td class ="col-actions"><button class ="btn-tbl-approve" onclick="adminApproveRequest('${rowKey}',this)">✓ Approve</button><button class ="btn-tbl-cancel" onclick="adminOpenCancelModal('request','${rowKey}','${escapeHtml(req.amenity)}','${escapeHtml(dateRange)}','${escapeHtml(name)}')">✕ Cancel</button></td></tr>`;
});
 html+='</tbody></table></div>';
 container.innerHTML=html;
}
function adminUpdateRequestBadge(count){
 const badge=document.getElementById("badge-requests");
 if(!badge)return ;
 if(count>0){
 badge.textContent=count;
 badge.style.display="inline-block";
}else{
 badge.style.display="none";
}
}
function adminApproveRequest(rowKey,btn){
 const[rowIndex,email,amenity,startDate]=rowKey.split("|");
 btn.disabled=true;
 btn.innerHTML="<em style='font-style:italic;text-align:center;display:block;'>Approving...</em>";
 
 const cancelBtn=btn.nextElementSibling;
 if(cancelBtn)cancelBtn.disabled=true;
 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({action:"adminApproveRequest",rowIndex,email,amenity,startDate})
})
 .then(r=>r.json())
 .then(data=>{
 if(data.success){
 adminLoadRequests(true);
 adminShowToast("✓ Reservation approved — resident notified.","success");
}else{
 btn.disabled=false;
 btn.textContent="✓ Approve";
 if(cancelBtn)cancelBtn.disabled=false;
 adminShowToast("Error:"+(data.message||"Please try again."),"error");
}
})
 .catch(()=>{
 btn.disabled=false;
 btn.textContent="✓ Approve";
 if(cancelBtn)cancelBtn.disabled=false;
 adminShowToast("Network error. Please try again.","error");
});
}
let adminReservationsData=[];
let _adminResCache=null;
const ADMIN_RES_TTL_MS=90_000;
function adminLoadReservations(forceRefresh){
 
 
 
 
 
 const now=Date.now();
 const cacheAge=_adminResCache ?(now-_adminResCache.ts):Infinity;
 const useCached=!forceRefresh&&_adminResCache&&cacheAge<ADMIN_RES_TTL_MS;
 if(useCached){
 
 adminReservationsData=_adminResCache.reservations;
 adminRenderReservations();
}else{
 
 document.getElementById("reservations-today-body").innerHTML='<div class ="admin-loading">Loading…</div>';
 document.getElementById("reservations-upcoming-body").innerHTML='<div class ="admin-loading">Loading…</div>';
}
 
 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({action:"getAdminReservations"})
})
 .then(r=>r.json())
 .then(data=>{
 if(!data.success){
 if(!useCached){
 document.getElementById("reservations-today-body").innerHTML='<div class ="admin-empty">Could not load reservations.</div>';
 document.getElementById("reservations-upcoming-body").innerHTML='<div class ="admin-empty">Could not load reservations.</div>';
}
 return ;
}
 adminReservationsData=data.reservations||[];
 _adminResCache={ts:Date.now(),reservations:adminReservationsData};
 adminRenderReservations();
})
 .catch(()=>{
 if(!useCached){
 document.getElementById("reservations-today-body").innerHTML='<div class ="admin-empty">Network error. Please try again.</div>';
 document.getElementById("reservations-upcoming-body").innerHTML='<div class ="admin-empty">Network error. Please try again.</div>';
}
});
}
let _resWindowPage=0;
function adminFmtShort(d){return d.toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function adminRenderReservations(){
 _resWindowPage=0;
 adminRenderResWindow();
 const todayStr=new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"});
 const todayRows=adminReservationsData.filter(r=>r.startDate===todayStr);
 adminRenderReservationTable("reservations-today-body",todayRows,"No bookings today.");
}
function adminRenderResWindow(){
 const now=new Date();now.setHours(0,0,0,0);
 const tomorrow=new Date(now);tomorrow.setDate(tomorrow.getDate()+1);
 const pageStart=new Date(tomorrow);pageStart.setDate(pageStart.getDate()+(_resWindowPage*30));
 const pageEnd=new Date(pageStart);pageEnd.setDate(pageEnd.getDate()+29);
 const rows=adminReservationsData.filter(r=>{
 const d=new Date(r.startDate+" 12:00:00");
 return d>=pageStart&&d<=pageEnd;
});
 const hdr=document.getElementById("reservations-upcoming-header");
 if(hdr)hdr.textContent="🗓️ "+adminFmtShort(pageStart)+" – "+adminFmtShort(pageEnd);
 adminRenderReservationTableGrouped("reservations-upcoming-body",rows,"No reservations in this window.");
 // Determine whether prev/next pages have data
 const prevStart=new Date(tomorrow);prevStart.setDate(prevStart.getDate()+((_resWindowPage-1)*30));
 const prevEnd=new Date(prevStart);prevEnd.setDate(prevEnd.getDate()+29);
 const hasPrev=_resWindowPage>0&&adminReservationsData.some(r=>{const d=new Date(r.startDate+" 12:00:00");return d>=prevStart&&d<=prevEnd;});
 const nextStart=new Date(tomorrow);nextStart.setDate(nextStart.getDate()+((_resWindowPage+1)*30));
 const nextEnd=new Date(nextStart);nextEnd.setDate(nextEnd.getDate()+29);
 const hasNext=adminReservationsData.some(r=>{const d=new Date(r.startDate+" 12:00:00");return d>=nextStart&&d<=nextEnd;});
 const showNav=hasPrev||hasNext;
 const nav=document.getElementById("res-window-nav");
 if(nav){nav.style.display=showNav?"flex":"none";}
 const prevBtn=document.getElementById("res-prev-btn");
 const nextBtn=document.getElementById("res-next-btn");
 const lbl=document.getElementById("res-window-label");
 if(prevBtn)prevBtn.style.visibility=hasPrev?"visible":"hidden";
 if(nextBtn)nextBtn.style.visibility=hasNext?"visible":"hidden";
 if(lbl)lbl.textContent=showNav?("Page "+(_resWindowPage+1)):"";
}
function adminResWindowNav(dir){
 _resWindowPage+=dir;
 if(_resWindowPage<0)_resWindowPage=0;
 adminRenderResWindow();
}
function adminRenderReservationTable(containerId,rows,emptyMsg){
 const container=document.getElementById(containerId);
 if(rows.length===0){
 container.innerHTML=`<div class ="admin-empty">${emptyMsg}</div>`;
 return ;
}
 
 rows.sort((a,b)=>new Date(a.startDate)-new Date(b.startDate));
 let html='<div class ="admin-table-wrap"><table class ="admin-table">';
 html+='<thead><tr><th>Amenity</th><th>Resident</th><th>Unit</th><th>Date(s)</th><th>Time</th><th class ="col-actions">Action</th></tr></thead><tbody>';
 rows.forEach(r=>html+=adminReservationRow(r));
 html+='</tbody></table></div>';
 container.innerHTML=html;
}
function adminRenderReservationTableGrouped(containerId,rows,emptyMsg){
 const container=document.getElementById(containerId);
 if(rows.length===0){
 container.innerHTML=`<div class ="admin-empty">${emptyMsg}</div>`;
 return ;
}
 const amenityOrder=["Guest Suite","Social Lounge","Conference Room"];
 rows.sort((a,b)=>{
 const ai=amenityOrder.indexOf(a.amenity),bi=amenityOrder.indexOf(b.amenity);
 if(ai!==bi)return ai-bi;
 return new Date(a.startDate)-new Date(b.startDate);
});
 let html='<div class ="admin-table-wrap"><table class ="admin-table">';
 html+='<thead><tr><th>Amenity</th><th>Resident</th><th>Unit</th><th>Date(s)</th><th>Time</th><th class ="col-actions">Action</th></tr></thead><tbody>';
 let lastAmenity=null;
 rows.forEach(r=>{
 if(r.amenity!==lastAmenity){
 lastAmenity=r.amenity;
 html+=`<tr class ="amenity-group-row"><td colspan="6">${escapeHtml(r.amenity)}</td></tr>`;
}
 html+=adminReservationRow(r);
});
 html+='</tbody></table></div>';
 container.innerHTML=html;
}
function adminReservationRow(r){
 const dateRange=adminDateRange(r.startDate,r.endDate,r.amenity);
 const timeRange=adminTimeRange(r.startTime,r.endTime,r.amenity);
 const name=escapeHtml(((r.firstName||"")+" "+(r.lastName||"")).trim());
 const rowKey=escapeHtml(r.rowIndex+"|"+r.email+"|"+r.amenity+"|"+r.startDate);
 return `<tr><td><strong>${escapeHtml(r.amenity)}</strong></td><td>${escapeHtml(name)}</td><td>${escapeHtml(String(r.unit||""))}</td><td>${escapeHtml(dateRange)}</td><td style="white-space:nowrap;">${escapeHtml(timeRange)}</td><td class ="col-actions"><button class ="btn-tbl-cancel" onclick="adminOpenCancelModal('approved','${rowKey}','${escapeHtml(r.amenity)}','${escapeHtml(dateRange)}','${escapeHtml(name)}')">✕ Cancel</button></td></tr>`;
}
let _cancelPending=null;
function adminOpenCancelModal(source,rowKey,amenity,dateRange,residentName){
 _cancelPending={source,rowKey};
 document.getElementById("admin-cancel-modal-detail").innerHTML=
 `<strong>${escapeHtml(amenity)}</strong>&mdash;${escapeHtml(dateRange)}<br>Resident:${escapeHtml(residentName)}`;
 document.getElementById("admin-cancel-note").value="";
 document.getElementById("admin-cancel-modal-confirm-btn").disabled=false;
 document.getElementById("admin-cancel-modal-confirm-btn").textContent="Yes,Cancel It";
 document.getElementById("admin-cancel-modal-overlay").classList.add("open");
}
function adminCancelModalClose(e){
 
 if(e.target===document.getElementById("admin-cancel-modal-overlay"))adminCancelModalDismiss();
}
function adminCancelModalDismiss(){
 document.getElementById("admin-cancel-modal-overlay").classList.remove("open");
 _cancelPending=null;
}
function adminCancelModalConfirm(){
 if(!_cancelPending)return ;
 const{source,rowKey}=_cancelPending;
 const[rowIndex,email,amenity,startDate]=rowKey.split("|");
 const note=document.getElementById("admin-cancel-note").value.trim();
 const confirmBtn=document.getElementById("admin-cancel-modal-confirm-btn");
 confirmBtn.disabled=true;
 confirmBtn.textContent="Cancelling…";
 fetch(WEB_APP_URL,{
 method:"POST",
 body:JSON.stringify({action:"adminCancelRequest",source,rowIndex,email,amenity,startDate,note})
})
 .then(r=>r.json())
 .then(data=>{
 adminCancelModalDismiss();
 if(data.success){
 adminShowToast("Reservation cancelled — resident notified.","success");
 
 if(source==="request")adminLoadRequests(true);
 else adminLoadReservations(true);
}else{
 adminShowToast("Error:"+(data.message||"Please try again."),"error");
}
})
 .catch(()=>{
 adminCancelModalDismiss();
 adminShowToast("Network error. Please try again.","error");
});
}
function adminShowToast(msg,type){
 
 const el=document.getElementById("bb-toast");
 if(!el)return ;
 el.textContent=msg;
 el.style.background=(type==="error")? "#e74c3c":"#27ae60";
 el.style.display="block";
 clearTimeout(window._adminToastTimer);
 window._adminToastTimer=setTimeout(()=>{el.style.display="none";},4000);
}
function bbToast(msg,type){
 const el=document.getElementById("bb-toast");
 el.textContent=msg;
 el.style.background=(type==="error")? "#e74c3c":"#93c47d";
 el.style.display="block";
 clearTimeout(window._bbToastTimer);
 window._bbToastTimer=setTimeout(()=>{el.style.display="none";},3500);
}
function escapeHtml(str){
 if(!str)return "";
 return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function formatPrice(price){
 if(!price)return "";
 const s=price.toString().trim();
 return s.startsWith("$")? s:"$"+s;
}

/* ============================================================
   STAFF NOTES — Phase 4
   ============================================================ */
let snNotesCache = [];
let snCacheLoaded = false;
let snPanelOpen = false;
let snDocked = true;
let snActivePanelFilter = '';
let snDragging = false, snDragOffsetX = 0, snDragOffsetY = 0;
let snResizing = false, snResizeStartX = 0, snResizeStartY = 0, snResizeStartW = 0, snResizeStartH = 0;

function staffNotesInit() {
  if (!currentUser) return;
  const role = (currentUser.role || '').toString().trim();
  if (role !== 'Admin' && role !== 'Staff') return;
  const fab = document.getElementById('sn-fab');
  if (fab) fab.style.display = 'flex';
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'N') { e.preventDefault(); staffNotesTogglePanel(); }
  });
  const header = document.getElementById('sn-panel-header');
  if (header) header.addEventListener('pointerdown', snDragStart);
  const resizeH = document.getElementById('sn-resize-handle');
  if (resizeH) resizeH.addEventListener('pointerdown', snResizeStart);
  const ta = document.getElementById('sn-panel-textarea');
  if (ta) ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); staffNotesSave(); }
  });
  snApplyDockedPosition();
}

function staffNotesTogglePanel() {
  const panel = document.getElementById('sn-floating-panel');
  const fab = document.getElementById('sn-fab');
  snPanelOpen = !snPanelOpen;
  if (panel) panel.style.display = snPanelOpen ? 'flex' : 'none';
  if (fab) fab.style.display = snPanelOpen ? 'none' : 'flex';
  if (snPanelOpen) staffNotesPanelLoad();
}

let snPopoutWindow = null;

// Refreshes the Staff Notes Log panel only when it is currently visible,
// and also refreshes the floating panel feed if it is open.
function _snRefreshAdminLogIfVisible() {
  const notesPanel = document.getElementById('admin-panel-notes');
  if (notesPanel && notesPanel.style.display !== 'none') {
    staffNotesAdminLoad();
  }
  // Also keep the docked panel feed fresh
  if (snPanelOpen) staffNotesPanelLoad();
}

function staffNotesToggleDock() {
  // If already popped out, focus existing window or close it
  if (snPopoutWindow && !snPopoutWindow.closed) {
    snPopoutWindow.focus();
    return;
  }
  // Open a real separate browser window (can move to second monitor)
  const w = 600, h = 620;
  const left = window.screenX + window.outerWidth + 20;
  const top = window.screenY + 40;
  snPopoutWindow = window.open('', 'StaffNotesPopout',
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=no,status=no,toolbar=no,menubar=no,location=no`
  );
  if (!snPopoutWindow) {
    adminShowToast('Pop-up was blocked. Please allow pop-ups for this site.', 'error');
    return;
  }
  snBuildPopoutWindow(snPopoutWindow);
  // Update dock button to show "focused" state
  const btn = document.getElementById('sn-dock-toggle-btn');
  if (btn) { btn.title = 'Focus pop-out window'; btn.textContent = '⤡'; }
  // Watch for close and sync the Staff Notes Log while popout is open
  const watchClose = setInterval(() => {
    if (snPopoutWindow && snPopoutWindow.closed) {
      clearInterval(watchClose);
      snPopoutWindow = null;
      const b = document.getElementById('sn-dock-toggle-btn');
      if (b) { b.title = 'Pop out'; b.textContent = '⤢'; }
      // Final refresh so any last changes show up in the log
      _snRefreshAdminLogIfVisible();
    }
  }, 800);

}

function snBuildPopoutWindow(win) {
  const doc = win.document;
  doc.open();
  doc.write(`<!DOCTYPE html><html lang="en"><head>
<meta charset="UTF-8">
<title>Staff Notes — Parks Edge</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #f0f4f8; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
  #sn-topbar { background: linear-gradient(135deg,#2a3a55,#1a2235); color: white; padding: 12px 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
  #sn-topbar .sn-title { font-weight: bold; font-size: 15px; flex: 1; }
  #sn-topbar .sn-role-chip { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: bold; }
  #sn-toolbar { padding: 10px 14px; border-bottom: 1px solid #dde3ea; background: white; display: flex; gap: 8px; flex-shrink: 0; align-items: center; }
  #sn-toolbar button { background: #2a3a55; color: white; border: none; padding: 7px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; }
  #sn-toolbar select { padding: 6px 10px; border: 1px solid #dde3ea; border-radius: 8px; font-size: 13px; background: white; }
  #sn-form-area { padding: 12px 14px; border-bottom: 1px solid #eef0f3; background: #f8fafc; display: none; flex-shrink: 0; }
  #sn-form-area textarea { width: 100%; padding: 10px 12px; font-size: 14px; border: 1px solid #ccd3da; border-radius: 8px; resize: none; font-family: Arial, sans-serif; line-height: 1.5; }
  #sn-form-area textarea:focus { outline: none; border-color: #2a3a55; box-shadow: 0 0 0 2px rgba(0,107,177,0.12); }
  .sn-form-row { display: flex; gap: 8px; margin-top: 8px; align-items: center; }
  #sn-urgency { padding: 6px 10px; border: 1px solid #ccd3da; border-radius: 8px; font-size: 13px; background: white; }
  .sn-btn-save { background: #2a3a55; color: white; border: none; padding: 7px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: bold; }
  .sn-btn-save:hover { background: #1a2235; }
  .sn-btn-save:disabled { background: #6da9d2; cursor: not-allowed; }
  .sn-btn-discard { background: white; color: #888; border: 1px solid #dde3ea; padding: 7px 12px; border-radius: 8px; cursor: pointer; font-size: 13px; }
  .sn-btn-discard:hover { background: #f5f5f5; }
  #sn-feed { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; }
  .sn-note-card { background: #f4f8fc; border: 1px solid #d8e8f4; border-radius: 10px; padding: 12px 14px; position: relative; }
  .sn-note-card.sn-urgent { background: #fff8f0; border-color: #f5c069; }
  .sn-note-card.sn-critical { background: #fff2f2; border-color: #f0a0a0; }
  .sn-note-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; flex-wrap: wrap; }
  .sn-author-chip { background: #2a3a55; color: white; border-radius: 10px; padding: 2px 9px; font-size: 11px; font-weight: bold; }
  .sn-timestamp { font-size: 11px; color: #aaa; }
  .sn-urgency-badge { font-size: 10px; font-weight: bold; border-radius: 8px; padding: 2px 7px; }
  .sn-urgency-badge.normal { background: #e8f5e8; color: #2e7d32; }
  .sn-urgency-badge.urgent { background: #fff3e0; color: #e65100; }
  .sn-urgency-badge.critical { background: #fde8e8; color: #c0392b; }
  .sn-note-text { font-size: 13px; color: #333; line-height: 1.55; white-space: pre-wrap; word-break: break-word; padding-right: 24px; }
  .sn-note-delete { position: absolute; top: 8px; right: 8px; background: none; border: none; color: #ccc; font-size: 15px; cursor: pointer; padding: 2px 6px; border-radius: 4px; line-height: 1; }
  .sn-note-delete:hover { background: #fde8e8; color: #c0392b; }
  .sn-feed-empty { text-align: center; color: #bbb; font-size: 13px; font-style: italic; padding: 30px 0; }
  .sn-feed-loading { text-align: center; color: #999; font-size: 13px; padding: 24px 0; }
  #sn-toast { display: none; position: fixed; top: 12px; left: 50%; transform: translateX(-50%); background: #27ae60; color: white; padding: 10px 20px; border-radius: 6px; z-index: 9999; font-size: 13px; font-weight: bold; box-shadow: 0 4px 14px rgba(0,0,0,0.10); white-space: nowrap; }
  .sn-delete-confirm { background: #fff5f5; border-top: 1px solid #f5c6cb; padding: 8px 12px; font-size: 12px; color: #c0392b; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; border-radius: 0 0 8px 8px; }

#login-container a{color:#D6D2C4;text-shadow:0 1px 2px rgba(0,0,0,0.28)}

#login-container::before{
content:"";
position:absolute;
inset:0;
background:linear-gradient(
  180deg,
  rgba(255,255,255,0.12) 0%,
  rgba(224,201,122,0.06) 18%,
  rgba(255,255,255,0.02) 42%,
  rgba(0,0,0,0) 72%
);
pointer-events:none;
border-radius:14px;
}
#login-container{position:relative;overflow:hidden;}


/* --- Logged-in UI adjustments --- */
body.logged-in{
  background-image:none !important;
  background:#f0f4f8;
  display:block;
  min-height:100vh;
}
body.logged-in::before{display:none;}
body.logged-in #main-app-content{
  min-height:100vh;
  display:flex;
  flex-direction:column;
}
body.logged-in #dashboard-view,
body.logged-in #booking-view,
body.logged-in #profile-view,
body.logged-in #fdn-view,
body.logged-in #bulletin-view,
body.logged-in #contacts-view{
  min-height:calc(100vh - 60px);
  flex:1;
}


#login-container,
#login-container *:not(h2){
font-family:'Inter', sans-serif;
}
#login-container h2{
font-family:'Playfair Display', serif;
font-weight:500;
letter-spacing:0.5px;
text-transform:uppercase;
color:#ffffff;
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
}

</style>

<style>
.plate::after {
  content: "";
  position: absolute;
  top: 0;
  left: -50%;
  width: 200%;
  height: 100%;
  pointer-events: none;
  background: linear-gradient(
    120deg,
    rgba(255,255,255,0) 0%,
    rgba(255,255,255,0.06) 40%,
    rgba(255,255,255,0.18) 50%,
    rgba(255,255,255,0.06) 60%,
    rgba(255,255,255,0) 100%
  );
  animation: sweep 5.5s cubic-bezier(0.4,0,0.2,1)  1 forwards;
}

@keyframes sweep {
  0% { transform: translateX(-120%); }
  100% { transform: translateX(120%); }
}
</style>

</head><body>
<div id="sn-topbar">
  <span style="font-size:18px;">📝</span>
  <span class="sn-title">Staff Notes</span>
  <span class="sn-role-chip" id="sn-role-chip">Staff</span>
</div>
<div id="sn-toolbar">
  <button onclick="snShowForm()">+ Add Note</button>
  <select id="sn-filter" onchange="snApplyFilter()">
    <option value="">All Notes</option>
    <option value="today">Today</option>
    <option value="week">This Week</option>
    <option value="critical">🔴 Critical</option>
    <option value="urgent">🟡 Urgent</option>
  </select>
  <button onclick="snLoad()" style="background:white;color:#555;border:1px solid #dde3ea;margin-left:auto;">↻ Refresh</button>
</div>
<div id="sn-form-area">
  <textarea id="sn-textarea" rows="3" placeholder="Write a note for the team... (Shift+Enter for new line, Enter to save)"></textarea>
  <div class="sn-form-row">
    <select id="sn-urgency">
      <option value="normal">🟢 Normal</option>
      <option value="urgent">🟡 Urgent</option>
      <option value="critical">🔴 Critical</option>
    </select>
    <div style="flex:1;"></div>
    <button class="sn-btn-discard" onclick="snHideForm()">Discard</button>
    <button class="sn-btn-save" id="sn-save-btn" onclick="snSave()">Post Note</button>
  </div>
</div>
<div id="sn-feed"><div class="sn-feed-loading">Loading notes...</div></div>
<div id="sn-toast"></div>
<script>
const WEB_APP_URL = ${JSON.stringify(window.WEB_APP_URL)};
const popoutUser = ${JSON.stringify(window.currentUser)};
let snNotes = [];
let snFilter = '';

document.getElementById('sn-role-chip').textContent = (popoutUser && popoutUser.role) ? popoutUser.role : 'Staff';

document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && document.getElementById('sn-form-area').style.display !== 'none') {
    if (document.activeElement === document.getElementById('sn-textarea')) {
      e.preventDefault(); snSave();
    }
  }
});

function snShowForm() {
  document.getElementById('sn-form-area').style.display = 'block';
  document.getElementById('sn-textarea').focus();
}
function snHideForm() {
  document.getElementById('sn-form-area').style.display = 'none';
  document.getElementById('sn-textarea').value = '';
  document.getElementById('sn-urgency').value = 'normal';
}
function snApplyFilter() {
  snFilter = document.getElementById('sn-filter').value;
  snRender();
}

async function snLoad() {
  const feed = document.getElementById('sn-feed');
  feed.innerHTML = '<div class="sn-feed-loading">Loading notes...</div>';
  try {
    const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getStaffNotes' }) });
    const data = await res.json();
    if (data.success) { snNotes = data.notes || []; snRender(); }
    else feed.innerHTML = '<div class="sn-feed-empty" style="color:#c0392b;">Could not load notes.</div>';
  } catch { feed.innerHTML = '<div class="sn-feed-empty" style="color:#c0392b;">Network error.</div>'; }
}

function snRender() {
  const feed = document.getElementById('sn-feed');
  let notes = [...snNotes];
  if (snFilter === 'today') {
    const td = _todayStr(); notes = notes.filter(n => (n.date || '').startsWith(td));
  } else if (snFilter === 'week') {
    const wk = _weekStart(); notes = notes.filter(n => new Date(n.timestamp) >= wk);
  } else if (snFilter === 'critical') {
    notes = notes.filter(n => n.urgency === 'critical');
  } else if (snFilter === 'urgent') {
    notes = notes.filter(n => n.urgency === 'urgent');
  }
  notes.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  if (!notes.length) { feed.innerHTML = '<div class="sn-feed-empty">No notes found.</div>'; return; }
  const frag = document.createDocumentFragment();
  notes.forEach(note => {
    const card = document.createElement('div');
    const urg = note.urgency || 'normal';
    card.className = 'sn-note-card' + (urg === 'urgent' ? ' sn-urgent' : urg === 'critical' ? ' sn-critical' : '');
    const ts = note.timestamp ? new Date(note.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
    const urgBadge = { normal: '🟢 Normal', urgent: '🟡 Urgent', critical: '🔴 Critical' }[urg] || '';
    const initials = _initials(note.author || '');
    card.innerHTML = \`<div class="sn-note-meta">
      <span class="sn-author-chip">\${esc(initials)}</span>
      <span style="font-size:12px;font-weight:bold;color:#1a2b3c;">\${esc(note.author || 'Staff')}</span>
      <span class="sn-urgency-badge \${urg}">\${urgBadge}</span>
      <span class="sn-timestamp">\${esc(ts)}</span>
    </div>
    <div class="sn-note-text">\${esc(note.note || '')}</div>
    <button class="sn-note-delete" onclick="snDeleteClick(\${note.rowIndex}, this)" title="Delete">✕</button>\`;
    frag.appendChild(card);
  });
  feed.innerHTML = ''; feed.appendChild(frag);
}

function snDeleteClick(rowIndex, btn) {
  const card = btn.closest('.sn-note-card');
  if (!card) return;
  const existing = card.querySelector('.sn-delete-confirm');
  if (existing) { existing.remove(); return; }
  const bar = document.createElement('div');
  bar.className = 'sn-delete-confirm';
  bar.innerHTML = '<span style="font-weight:bold;">Delete this note?</span>'
    + '<button onclick="snDeleteConfirm(' + rowIndex + ',this)" style="background:#c0392b;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">Delete</button>'
    + '<button onclick="this.closest(\\'.sn-delete-confirm\\').remove()" style="background:#eee;color:#555;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Cancel</button>';
  card.appendChild(bar);
}

async function snDeleteConfirm(rowIndex, confirmBtn) {
  confirmBtn.disabled = true; confirmBtn.textContent = 'Deleting...';
  try {
    const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'deleteStaffNote', rowIndex, authorEmail: popoutUser.email }) });
    const data = await res.json();
    if (data.success) {
      snNotes = snNotes.filter(n => n.rowIndex !== rowIndex);
      snRender();
      snToast('Note deleted.', 'success');
      // Immediately refresh the main window's Staff Notes Log
      try { if (window.opener && !window.opener.closed) window.opener._snRefreshAdminLogIfVisible(); } catch(e) {}
    } else { confirmBtn.disabled = false; confirmBtn.textContent = 'Delete'; snToast('Could not delete note.', 'error'); }
  } catch { confirmBtn.disabled = false; confirmBtn.textContent = 'Delete'; snToast('Network error.', 'error'); }
}

async function snSave() {
  const text = (document.getElementById('sn-textarea').value || '').trim();
  if (!text) return;
  const urgency = document.getElementById('sn-urgency').value;
  const btn = document.getElementById('sn-save-btn');
  btn.disabled = true; btn.textContent = 'Saving...';
  try {
    const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({
      action: 'saveStaffNote', note: text, urgency,
      author: (popoutUser.firstName + ' ' + popoutUser.lastName).trim(),
      authorEmail: popoutUser.email, role: popoutUser.role || ''
    })});
    const data = await res.json();
    if (data.success) {
      snHideForm(); btn.disabled = false; btn.textContent = 'Post Note';
      snToast('✓ Note posted!', 'success');
      await snLoad();
      // Immediately refresh the main window's Staff Notes Log
      try { if (window.opener && !window.opener.closed) window.opener._snRefreshAdminLogIfVisible(); } catch(e) {}
    } else { btn.disabled = false; btn.textContent = 'Post Note'; snToast('Error saving note.', 'error'); }
  } catch { btn.disabled = false; btn.textContent = 'Post Note'; snToast('Network error.', 'error'); }
}

function snToast(msg, type) {
  const el = document.getElementById('sn-toast');
  el.textContent = msg;
  el.style.background = type === 'error' ? '#e74c3c' : '#27ae60';
  el.style.display = 'block';
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => el.style.display = 'none', 3000);
}
function esc(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function _initials(name) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function _todayStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function _weekStart() { const d = new Date(); d.setDate(d.getDate() - d.getDay()); d.setHours(0,0,0,0); return d; }

snLoad();
<\/script>
</body></html>`);
  doc.close();
}

function snApplyDockedPosition() {
  const panel = document.getElementById('sn-floating-panel');
  if (!panel) return;
  panel.style.left=''; panel.style.top=''; panel.style.right='24px'; panel.style.bottom='0';
}

function snDragStart(e) {
  if (snDocked) return;
  if (e.target.tagName==='BUTTON'||e.target.tagName==='SELECT') return;
  snDragging = true;
  const panel = document.getElementById('sn-floating-panel');
  const rect = panel.getBoundingClientRect();
  snDragOffsetX = e.clientX - rect.left;
  snDragOffsetY = e.clientY - rect.top;
  panel.setPointerCapture(e.pointerId);
  panel.addEventListener('pointermove', snDragMove);
  panel.addEventListener('pointerup', snDragEnd);
  e.preventDefault();
}
function snDragMove(e) {
  if (!snDragging) return;
  const panel = document.getElementById('sn-floating-panel');
  let l = e.clientX - snDragOffsetX, t = e.clientY - snDragOffsetY;
  const vw=window.innerWidth, vh=window.innerHeight, pw=panel.offsetWidth, ph=panel.offsetHeight;
  l=Math.max(0,Math.min(l,vw-pw)); t=Math.max(0,Math.min(t,vh-ph));
  panel.style.left=l+'px'; panel.style.top=t+'px'; panel.style.right=''; panel.style.bottom='';
}
function snDragEnd(e) {
  snDragging=false;
  const panel=document.getElementById('sn-floating-panel');
  panel.removeEventListener('pointermove',snDragMove);
  panel.removeEventListener('pointerup',snDragEnd);
}

function snResizeStart(e) {
  if (snDocked) return;
  snResizing=true;
  const panel=document.getElementById('sn-floating-panel');
  const rect=panel.getBoundingClientRect();
  snResizeStartX=e.clientX; snResizeStartY=e.clientY;
  snResizeStartW=rect.width; snResizeStartH=rect.height;
  document.addEventListener('pointermove',snResizeMove);
  document.addEventListener('pointerup',snResizeEnd);
  e.preventDefault();
}
function snResizeMove(e) {
  if (!snResizing) return;
  const panel=document.getElementById('sn-floating-panel');
  panel.style.width=Math.max(300,snResizeStartW+(e.clientX-snResizeStartX))+'px';
  panel.style.height=Math.max(250,snResizeStartH+(e.clientY-snResizeStartY))+'px';
}
function snResizeEnd() {
  snResizing=false;
  document.removeEventListener('pointermove',snResizeMove);
  document.removeEventListener('pointerup',snResizeEnd);
}

async function staffNotesPanelLoad() {
  const feed=document.getElementById('sn-panel-feed');
  if (!feed) return;
  feed.innerHTML='<div class="sn-feed-loading">Loading notes...</div>';
  try {
    const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getStaffNotes'})});
    const data=await res.json();
    if (data.success) { snNotesCache=data.notes||[]; snCacheLoaded=true; staffNotesPanelRender(); }
    else feed.innerHTML='<div class="sn-feed-empty" style="color:#c0392b;">Could not load notes.</div>';
  } catch { feed.innerHTML='<div class="sn-feed-empty" style="color:#c0392b;">Network error.</div>'; }
}

function staffNotesPanelFilter() {
  snActivePanelFilter=document.getElementById('sn-panel-filter').value;
  staffNotesPanelRender();
}

function staffNotesPanelRender() {
  const feed=document.getElementById('sn-panel-feed');
  if (!feed) return;
  let notes=[...snNotesCache];
  const f=snActivePanelFilter;
  if (f==='today') { const td=_snTodayStr(); notes=notes.filter(n=>(n.date||'').startsWith(td)); }
  else if (f==='week') { const wk=_snWeekStart(); notes=notes.filter(n=>new Date(n.timestamp)>=wk); }
  else if (f==='critical') notes=notes.filter(n=>n.urgency==='critical');
  else if (f==='urgent') notes=notes.filter(n=>n.urgency==='urgent');
  notes.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  if (!notes.length) { feed.innerHTML='<div class="sn-feed-empty">No notes found.</div>'; return; }
  const frag=document.createDocumentFragment();
  notes.forEach(note=>{
    const card=document.createElement('div');
    const urg=note.urgency||'normal';
    card.className='sn-note-card'+(urg==='urgent'?' sn-urgent':urg==='critical'?' sn-critical':'');
    const ts=note.timestamp?new Date(note.timestamp).toLocaleString([],{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
    const urgBadge={normal:'🟢 Normal',urgent:'🟡 Urgent',critical:'🔴 Critical'}[urg]||'';
    card.innerHTML=`<div class="sn-note-meta"><span class="sn-author-chip">${escapeHtml(_snInitials(note.author||''))}</span><span style="font-size:12px;font-weight:bold;color:#1a2b3c;">${escapeHtml(note.author||'Staff')}</span><span class="sn-urgency-badge ${urg}">${urgBadge}</span><span class="sn-timestamp">${escapeHtml(ts)}</span></div><div class="sn-note-text">${escapeHtml(note.note||'')}</div><button class="sn-note-delete" onclick="staffNotesDelete(${note.rowIndex},this)" title="Delete">✕</button>`;
    frag.appendChild(card);
  });
  feed.innerHTML=''; feed.appendChild(frag);
}

function staffNotesPanelShowForm() {
  const form=document.getElementById('sn-panel-form');
  if (form) { form.style.display='block'; document.getElementById('sn-panel-textarea').focus(); }
}
function staffNotesCancelForm() {
  document.getElementById('sn-panel-form').style.display='none';
  document.getElementById('sn-panel-textarea').value='';
  document.getElementById('sn-urgency').value='normal';
}

async function staffNotesSave() {
  const text=(document.getElementById('sn-panel-textarea').value||'').trim();
  if (!text) return;
  const urgency=document.getElementById('sn-urgency').value;
  const btn=document.getElementById('sn-save-btn');
  btn.disabled=true; btn.textContent='Saving...';
  try {
    const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'saveStaffNote',note:text,urgency:urgency,author:(currentUser.firstName+' '+currentUser.lastName).trim(),authorEmail:currentUser.email,role:currentUser.role||''})});
    const data=await res.json();
    if (data.success) {
      document.getElementById('sn-panel-textarea').value='';
      document.getElementById('sn-urgency').value='normal';
      document.getElementById('sn-panel-form').style.display='none';
      btn.disabled=false; btn.textContent='Post Note';
      staffNotesPanelLoad();
      if (document.getElementById('admin-panel-notes')&&document.getElementById('admin-panel-notes').style.display!=='none') staffNotesAdminLoad();
    } else { btn.disabled=false; btn.textContent='Post Note'; adminShowToast('Error saving note.','error'); }
  } catch { btn.disabled=false; btn.textContent='Post Note'; adminShowToast('Network error.','error'); }
}

function staffNotesDelete(rowIndex, btn) {
  const card = btn.closest('.sn-note-card');
  if (!card) return;
  const existing = card.querySelector('.sn-delete-confirm');
  if (existing) { existing.remove(); return; }
  const bar = document.createElement('div');
  bar.className = 'sn-delete-confirm';
  bar.style.cssText = 'background:#fff5f5;border-top:1px solid #f5c6cb;padding:8px 12px;font-size:12px;color:#c0392b;display:flex;align-items:center;gap:8px;flex-wrap:wrap;';
  bar.innerHTML = '<span style="font-weight:bold;">Delete this note?</span>'
    + '<button onclick="staffNotesDeleteConfirm(' + rowIndex + ',this)" style="background:#c0392b;color:white;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;font-weight:bold;">Delete</button>'
    + '<button onclick="this.closest(\'.sn-delete-confirm\').remove()" style="background:#eee;color:#555;border:none;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:12px;">Cancel</button>';
  card.appendChild(bar);
}

async function staffNotesDeleteConfirm(rowIndex, confirmBtn) {
  confirmBtn.disabled=true; confirmBtn.textContent='Deleting...';
  try {
    const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteStaffNote',rowIndex:rowIndex,authorEmail:currentUser.email})});
    const data=await res.json();
    if (data.success) {
      snNotesCache=snNotesCache.filter(n=>n.rowIndex!==rowIndex);
      snAdminNotesCache=snAdminNotesCache.filter(n=>n.rowIndex!==rowIndex);
      staffNotesPanelRender();
      staffNotesPopulateAuthorFilter();
      staffNotesRender();
    }
    else { confirmBtn.disabled=false; confirmBtn.textContent='Delete'; adminShowToast('Could not delete note.','error'); }
  } catch { confirmBtn.disabled=false; confirmBtn.textContent='Delete'; adminShowToast('Network error.','error'); }
}

let snAdminNotesCache=[];
async function staffNotesAdminLoad() {
  const list=document.getElementById('sn-notes-list');
  if (!list) return;
  list.innerHTML='<div class="admin-loading">Loading notes...</div>';
  try {
    const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getStaffNotes'})});
    const data=await res.json();
    if (data.success) {
      snAdminNotesCache=data.notes||[]; snNotesCache=snAdminNotesCache; snCacheLoaded=true;
      staffNotesPopulateAuthorFilter(); staffNotesRender();
    } else list.innerHTML='<div class="admin-empty">Could not load notes.</div>';
  } catch { list.innerHTML='<div class="admin-empty">Network error.</div>'; }
}

function staffNotesRefresh() { staffNotesAdminLoad(); }

function staffNotesPopulateAuthorFilter() {
  const sel=document.getElementById('sn-filter-author');
  if (!sel) return;
  const cur=sel.value;
  const authors=[...new Set(snAdminNotesCache.map(n=>n.author).filter(Boolean))];
  sel.innerHTML='<option value="">All Authors</option>'+authors.map(a=>`<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`).join('');
  sel.value=cur;
}

function staffNotesRender() {
  const list=document.getElementById('sn-notes-list');
  if (!list) return;
  const search=(document.getElementById('sn-search')?.value||'').toLowerCase();
  const author=document.getElementById('sn-filter-author')?.value||'';
  const dateF=document.getElementById('sn-filter-date')?.value||'';
  let notes=[...snAdminNotesCache];
  if (author) notes=notes.filter(n=>n.author===author);
  if (dateF==='today') { const td=_snTodayStr(); notes=notes.filter(n=>(n.date||'').startsWith(td)); }
  else if (dateF==='week') { const wk=_snWeekStart(); notes=notes.filter(n=>new Date(n.timestamp)>=wk); }
  else if (dateF==='month') { const mo=_snMonthStart(); notes=notes.filter(n=>new Date(n.timestamp)>=mo); }
  if (search) notes=notes.filter(n=>(n.note||'').toLowerCase().includes(search)||(n.author||'').toLowerCase().includes(search));
  notes.sort((a,b)=>new Date(b.timestamp)-new Date(a.timestamp));
  if (!notes.length) { list.innerHTML='<div style="text-align:center;padding:40px;color:#aaa;font-style:italic;">No notes found.</div>'; return; }
  const frag=document.createDocumentFragment();
  const urgLabels={normal:'🟢 Normal',urgent:'🟡 Urgent',critical:'🔴 Critical'};
  notes.forEach(note=>{
    const urg=note.urgency||'normal';
    const ts=note.timestamp?new Date(note.timestamp).toLocaleString([],{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'';
    const row=document.createElement('div');
    row.className='sn-panel-note-row';
    if (urg==='critical') row.style.background='#fff5f5';
    else if (urg==='urgent') row.style.background='#fffbf0';
    row.innerHTML=`<div class="sn-panel-note-left"><div class="sn-avatar" style="${urg==='critical'?'background:#c0392b;':urg==='urgent'?'background:#e65100;':''}">${escapeHtml(_snInitials(note.author||''))}</div></div><div class="sn-panel-note-content"><div class="sn-panel-note-header"><span class="sn-panel-note-author">${escapeHtml(note.author||'Staff')}</span><span class="sn-urgency-badge ${urg}">${urgLabels[urg]||''}</span><span class="sn-panel-note-time">${escapeHtml(ts)}</span></div><div class="sn-panel-note-text">${escapeHtml(note.note||'')}</div></div><div class="sn-panel-note-actions"><button onclick="staffNotesDeleteAdmin(${note.rowIndex},this)" style="background:none;border:1px solid #f5c6cb;color:#c0392b;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px;">Delete</button></div>`;
    frag.appendChild(row);
  });
  list.innerHTML=''; list.appendChild(frag);
}

function staffNotesDeleteAdmin(rowIndex, btn) {
  const row = btn.closest('.sn-panel-note-row');
  if (!row) return;
  const existing = row.nextSibling && row.nextSibling.classList && row.nextSibling.classList.contains('sn-admin-delete-confirm') ? row.nextSibling : null;
  if (existing) { existing.remove(); return; }
  const bar = document.createElement('div');
  bar.className = 'sn-admin-delete-confirm';
  bar.style.cssText = 'background:#fff5f5;border-bottom:1px solid #f5c6cb;padding:10px 18px;font-size:13px;color:#c0392b;display:flex;align-items:center;gap:10px;flex-wrap:wrap;';
  bar.innerHTML = '<span style="font-weight:bold;">Delete this note?</span>'
    + '<button onclick="staffNotesDeleteAdminConfirm(' + rowIndex + ',this)" style="background:#c0392b;color:white;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;">Delete</button>'
    + '<button onclick="this.closest(\'.sn-admin-delete-confirm\').remove()" style="background:#eee;color:#555;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;">Cancel</button>';
  row.insertAdjacentElement('afterend', bar);
}

async function staffNotesDeleteAdminConfirm(rowIndex, confirmBtn) {
  confirmBtn.disabled=true; confirmBtn.textContent='Deleting...';
  try {
    const res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteStaffNote',rowIndex:rowIndex,authorEmail:currentUser.email})});
    const data=await res.json();
    if (data.success) {
      snAdminNotesCache=snAdminNotesCache.filter(n=>n.rowIndex!==rowIndex);
      snNotesCache=snAdminNotesCache;
      staffNotesPopulateAuthorFilter();
      staffNotesRender();
      staffNotesPanelRender();
    }
    else { confirmBtn.disabled=false; confirmBtn.textContent='Delete'; adminShowToast('Could not delete note.','error'); }
  } catch { confirmBtn.disabled=false; confirmBtn.textContent='Delete'; adminShowToast('Network error.','error'); }
}

function staffNotesOpenForm() {
  staffNotesToggleDock();
}

function _snInitials(name) {
  const parts=name.trim().split(' ').filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length===1) return parts[0][0].toUpperCase();
  return (parts[0][0]+parts[parts.length-1][0]).toUpperCase();
}
function _snTodayStr() {
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function _snWeekStart() { const d=new Date(); d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return d; }
function _snMonthStart() { const d=new Date(); d.setDate(1); d.setHours(0,0,0,0); return d; }

// staffNotesInit and staffNotesAdminLoad are called directly
// from the existing adminNavigate and initApp hooks below via snAdminNavHook.
// ===== PHASE 5: RESIDENT MANAGEMENT =====


// -- Phase 7: Communications Center --
(function injectCommStyles(){
  var s=document.createElement('style');
  s.textContent='.comm-aud-btn{background:#f0f6fb;border:1px solid #b3d1e8;color:#2a3a55;padding:8px 16px;border-radius:20px;cursor:pointer;font-size:13px;font-weight:bold;}'
    +'.comm-aud-btn.active{background:#2a3a55;color:white;border-color:#2a3a55;}';
  document.head.appendChild(s);
})();
var commAudience='all';
var commLogLoaded=false;
function commPanelInit(){if(!commLogLoaded){commLoadLog();commLogLoaded=true;}}
function commSetAudience(val,btn){
  commAudience=val;
  document.querySelectorAll('.comm-aud-btn').forEach(function(b){b.classList.remove('active');});
  if(btn)btn.classList.add('active');
  document.getElementById('comm-building-wrap').style.display=val==='building'?'':'none';
  document.getElementById('comm-group-wrap').style.display=val==='group'?'':'none';
  document.getElementById('comm-unit-wrap').style.display=val==='unit'?'':'none';
  commClearPreview();
}
function commClearPreview(){
  var box=document.getElementById('comm-preview-box');
  if(box)box.style.display='none';
}
function commBuildPayload(){
  var p={audience:commAudience};
  if(commAudience==='building')p.building=(document.getElementById('comm-building')||{}).value||'';
  if(commAudience==='group')p.group=(document.getElementById('comm-group')||{}).value||'';
  if(commAudience==='unit')p.unit=(document.getElementById('comm-unit')||{}).value||'';
  return p;
}
async function commPreview(){
  var box=document.getElementById('comm-preview-box');
  box.innerHTML='<span style="color:#888;font-size:13px;">Loading recipients…</span>';
  box.style.display='';
  var payload=commBuildPayload();
  payload.action='getRecipientsPreview';
  try{
    var res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify(payload)});
    var data=await res.json();
    if(!data.success){box.innerHTML='<span style="color:#c0392b;font-size:13px;">Error: '+escapeHtml(data.message||'Failed')+'</span>';return;}
    if(!data.count){box.innerHTML='<span style="color:#888;font-style:italic;font-size:13px;">No residents found for that audience.</span>';return;}
    var rows=data.recipients.map(function(r){
      return '<div style="display:flex;gap:10px;padding:4px 0;font-size:13px;border-bottom:1px solid #eef0f3;">'
        +'<span style="font-weight:600;min-width:60px;">Unit '+escapeHtml(String(r.unit||''))+'</span>'
        +'<span style="color:#2a3a55;">'+escapeHtml(r.name)+'</span>'
        +'<span style="color:#888;margin-left:auto;">'+escapeHtml(r.email)+'</span>'
        +'</div>';
    }).join('');
    box.innerHTML='<div style="font-weight:700;color:#2a3a55;font-size:13px;margin-bottom:8px;">'
      +data.count+' recipient'+(data.count!==1?'s':'')+' will receive this message:</div>'+rows;
  }catch(e){box.innerHTML='<span style="color:#c0392b;font-size:13px;">Connection error.</span>';}
}
// ---- Attachment state ----
var commAttachFiles = []; // Array of {name, mimeType, base64}

function commAttachFilesSelected(input){
  Array.from(input.files).forEach(function(file){ commAddAttachment(file); });
  input.value='';
}
function commHandleAttachDrop(e){
  e.preventDefault();
  document.getElementById('comm-attach-zone').style.borderColor='#b3d1e8';
  Array.from(e.dataTransfer.files).forEach(function(file){ commAddAttachment(file); });
}
function commAddAttachment(file){
  var MAX=10*1024*1024;
  if(file.size>MAX){alert(file.name+' exceeds the 10 MB limit and was not added.');return;}
  var reader=new FileReader();
  reader.onload=function(ev){
    var b64=ev.target.result.split(',')[1];
    commAttachFiles.push({name:file.name,mimeType:file.type||'application/octet-stream',base64:b64});
    commRenderAttachList();
  };
  reader.readAsDataURL(file);
}
function commRemoveAttachment(idx){
  commAttachFiles.splice(idx,1);
  commRenderAttachList();
}
function commRenderAttachList(){
  var list=document.getElementById('comm-attach-list');
  if(!list)return;
  if(!commAttachFiles.length){list.innerHTML='';return;}
  list.innerHTML=commAttachFiles.map(function(f,i){
    var ext=f.name.split('.').pop().toLowerCase();
    var icon=({pdf:'📄',doc:'📝',docx:'📝',xls:'📊',xlsx:'📊',ppt:'📑',pptx:'📑',png:'🖼',jpg:'🖼',jpeg:'🖼',gif:'🖼'})[ext]||'📎';
    return '<div style="display:flex;align-items:center;gap:8px;background:#f4f7f9;border:1px solid #dde3ea;border-radius:8px;padding:7px 12px;font-size:13px;">'
      +'<span style="font-size:18px;">'+icon+'</span>'
      +'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#2a3a55;font-weight:600;">'+escapeHtml(f.name)+'</span>'
      +'<button onclick="commRemoveAttachment('+i+')" style="background:none;border:1px solid #f5c6cb;color:#c0392b;padding:2px 8px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;flex-shrink:0;">✕</button>'
      +'</div>';
  }).join('');
}
function commClearAttachments(){
  commAttachFiles=[];
  commRenderAttachList();
}

async function commSend(){
  var subject=(document.getElementById('comm-subject')||{}).value||'';
  var body=(document.getElementById('comm-body')||{}).value||'';
  var btn=document.getElementById('comm-send-btn');
  var statusEl=document.getElementById('comm-status-msg');
  function showStatus(msg,ok){
    statusEl.textContent=msg;
    statusEl.style.background=ok?'#e8f5e9':'#fde8e8';
    statusEl.style.color=ok?'#2e7d32':'#c0392b';
    statusEl.style.border='1px solid '+(ok?'#a5d6a7':'#f5c6cb');
    statusEl.style.display='';
  }
  if(!subject.trim()||!body.trim()){showStatus('Please fill in both Subject and Message Body.',false);return;}
  var payload=commBuildPayload();
  if(payload.audience==='building'&&!payload.building){showStatus('Please select a building.',false);return;}
  if(payload.audience==='group'&&!payload.group){showStatus('Please select a group.',false);return;}
  if(payload.audience==='unit'&&!payload.unit){showStatus('Please enter a unit number.',false);return;}
  var attachLabel=commAttachFiles.length?' with '+commAttachFiles.length+' attachment'+(commAttachFiles.length!==1?'s':''):'';
  if(!confirm('Send this email'+attachLabel+' to the selected recipients?'))return;
  btn.disabled=true;btn.textContent='Sending…';
  statusEl.style.display='none';
  payload.action='sendCommunication';
  payload.subject=subject;
  payload.body=body;
  payload.senderName=(window.currentUser?(currentUser.firstName+' '+currentUser.lastName).trim():'Admin');
  if(commAttachFiles.length)payload.attachments=commAttachFiles.map(function(f){return{name:f.name,mimeType:f.mimeType,base64:f.base64};});
  try{
    var res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify(payload)});
    var data=await res.json();
    if(data.success){
      var msg='✓ Sent to '+data.sentCount+' recipient'+(data.sentCount!==1?'s':'')+'. ';
      if(data.failCount)msg+=data.failCount+' failed.';
      showStatus(msg,true);
      document.getElementById('comm-subject').value='';
      document.getElementById('comm-body').value='';
      commClearPreview();
      commClearAttachments();
      commLogLoaded=false;
      commLoadLog();
    }else{showStatus('Error: '+escapeHtml(data.message||'Send failed.'),false);}
  }catch(e){showStatus('Connection error. Please try again.',false);}
  btn.disabled=false;btn.textContent='📤 Send Email';
}
async function commLoadLog(){
  var tbody=document.getElementById('comm-log-tbody');
  if(!tbody)return;
  tbody.innerHTML='<tr><td colspan="7" class="fdn-empty">Loading…</td></tr>';
  try{
    var res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getCommunicationLog'})});
    var data=await res.json();
    var log=data.log||[];
    if(!log.length){tbody.innerHTML='<tr><td colspan="7" class="fdn-empty">No messages sent yet.</td></tr>';return;}
    tbody.innerHTML=log.map(function(entry){
      return '<tr>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:12px;color:#666;white-space:nowrap;">'+escapeHtml(entry.timestamp)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;">'+escapeHtml(entry.sender)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;">'+escapeHtml(entry.audience)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;">'+escapeHtml(entry.subject)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;text-align:center;color:#2e7d32;font-weight:bold;">'+(entry.sentCount||0)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;text-align:center;color:'+(entry.failCount?'#c0392b':'#888')+';font-weight:'+(entry.failCount?'bold':'normal')+';">'+(entry.failCount||0)+'</td>'
        +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;text-align:center;">'
        +'<button onclick="commDeleteLogEntry('+entry.rowIndex+',this)" title="Delete this log entry" style="background:none;border:1px solid #f5c6cb;color:#c0392b;padding:3px 9px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;line-height:1.4;">✕</button>'
        +'</td>'
        +'</tr>';
    }).join('');
  }catch(e){tbody.innerHTML='<tr><td colspan="7" class="fdn-empty" style="color:#c0392b;">Failed to load log.</td></tr>';}
}
async function commDeleteLogEntry(rowIndex,btn){
  if(!confirm('Delete this log entry? This cannot be undone.'))return;
  btn.disabled=true;btn.textContent='…';
  try{
    var res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteCommunicationLog',rowIndex:rowIndex})});
    var data=await res.json();
    if(data.success){
      commLogLoaded=false;
      commLoadLog();
    }else{
      alert('Error: '+(data.message||'Could not delete entry.'));
      btn.disabled=false;btn.textContent='✕';
    }
  }catch(e){
    alert('Connection error. Please try again.');
    btn.disabled=false;btn.textContent='✕';
  }
}
// -- End Phase 7 --

// -- Phase 6: Admin FD Notifications --
var fdnAdminAll=[];
var fdnAdminEditRowIndex=null;
function fdnAdminLoad(force){
  var tbody=document.getElementById('fdn-admin-tbody');
  if(tbody)tbody.innerHTML='<tr><td colspan="6" class="fdn-empty">Loading…</td></tr>';
  fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'getFrontDeskInstructions',email:''})})
  .then(function(r){return r.json();})
  .then(function(data){fdnAdminAll=data.instructions||[];fdnAdminRender();})
  .catch(function(){var tbody=document.getElementById('fdn-admin-tbody');if(tbody)tbody.innerHTML='<tr><td colspan="6" class="fdn-empty" style="color:#c0392b;">Failed to load.</td></tr>';});
}
function fdnAdminIsActive(r){if(!r.endDate||r.endDate==='No Expiration')return true;var d=new Date(r.endDate);if(isNaN(d))return true;var now=new Date();var endUTC=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()));var todayUTC=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));return endUTC>=todayUTC;}
function fdnAdminRender(){
  var tbody=document.getElementById('fdn-admin-tbody');if(!tbody)return;
  var search=(document.getElementById('fdn-admin-search')||{}).value||'';
  var filterVal=(document.getElementById('fdn-admin-filter')||{}).value||'active';
  var q=search.toLowerCase();
  var list=fdnAdminAll.filter(function(r){
    if(!q && filterVal==='active'){
      // Exclude No Expiration and inactive (expired) items
      if(!r.endDate||r.endDate==='No Expiration')return false;
      if(!fdnAdminIsActive(r))return false;
    }
    if(!q)return true;
    return (String(r.unit||'')+' '+(r.firstName||'')+' '+(r.lastName||'')+(r.instructionType||'')+(r.instructions||'')).toLowerCase().indexOf(q)>=0;
  });
  // When viewing active only: sort by end date soonest first, then unit number smallest first
  if(!q && filterVal==='active'){
    list.sort(function(a,b){
      var da=new Date(a.endDate), db=new Date(b.endDate);
      if(da-db!==0)return da-db;
      var ua=parseFloat(a.unit)||0, ub=parseFloat(b.unit)||0;
      if(ua!==ub)return ua-ub;
      return String(a.unit||'').localeCompare(String(b.unit||''));
    });
  }
  if(!list.length){tbody.innerHTML='<tr><td colspan="6" class="fdn-empty">No notifications found.</td></tr>';return;}
  tbody.innerHTML=list.map(function(r){
    var active=fdnAdminIsActive(r);
    var endLabel=(!r.endDate||r.endDate==='No Expiration')?'No Expiration':fdnDisplayDate(r.endDate);
    return '<tr style="'+(active?'':'opacity:0.5;')+'">'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-weight:600;">'+escapeHtml(String(r.unit||'—'))+'</td>'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;"><a href="#" onclick="adminNavigate(\'residents\',document.querySelector(\'[data-panel=residents]\'));setTimeout(function(){resMgmtOpenProfile(\''+escapeHtml(r.email||'')+'\')},400);return false;" style="color:#2a3a55;font-weight:500;">'+escapeHtml((r.firstName||'')+' '+(r.lastName||''))+'</a><div style="font-size:11px;color:#888;">'+escapeHtml(r.email||'')+'</div></td>'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;"><span class="fdn-type-badge">'+escapeHtml(r.instructionType||'—')+'</span><div style="font-size:12px;color:#444;margin-top:4px;">'+escapeHtml(r.instructions||'')+'</div></td>'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;">'+fdnDisplayDate(r.startDate)+'</td>'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;font-size:13px;">'+endLabel+'</td>'
      +'<td style="padding:10px 14px;border-bottom:1px solid #eef0f3;white-space:nowrap;text-align:center;">'
      +'<button onclick="fdnAdminOpenEdit('+r.rowIndex+')" style="background:none;border:1px solid #b3d1e8;color:#2a3a55;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;margin-right:4px;">Edit</button>'
      +'<button onclick="fdnAdminConfirmRemove('+r.rowIndex+',this)" style="background:none;border:1px solid #f5c6cb;color:#c0392b;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">Remove</button>'
      +'</td></tr>';
  }).join('');
}
function fdnAdminOpenForm(){fdnAdminEditRowIndex=null;document.getElementById('fdn-admin-form-title').textContent='Add Notification';['unit','email','first','last','type','text','start','end'].forEach(function(f){var el=document.getElementById('fdn-admin-'+f);if(el)el.value='';});var msg=document.getElementById('fdn-admin-form-msg');if(msg){msg.style.display='none';msg.textContent='';}document.getElementById('fdn-admin-form-wrap').style.display='';document.getElementById('fdn-admin-form-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});}
function fdnAdminOpenEdit(rowIndex){var r=fdnAdminAll.find(function(x){return x.rowIndex===rowIndex;});if(!r)return;fdnAdminEditRowIndex=rowIndex;document.getElementById('fdn-admin-form-title').textContent='Edit Notification — Unit '+(r.unit||'');document.getElementById('fdn-admin-unit').value=r.unit||'';document.getElementById('fdn-admin-email').value=r.email||'';document.getElementById('fdn-admin-first').value=r.firstName||'';document.getElementById('fdn-admin-last').value=r.lastName||'';document.getElementById('fdn-admin-type').value=r.instructionType||'';document.getElementById('fdn-admin-text').value=r.instructions||'';function toInputDate(val){if(!val||val==='No Expiration')return '';var d=new Date(val);if(isNaN(d))return '';return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0')+'-'+String(d.getUTCDate()).padStart(2,'0');}document.getElementById('fdn-admin-start').value=toInputDate(r.startDate);document.getElementById('fdn-admin-end').value=toInputDate(r.endDate);var msg=document.getElementById('fdn-admin-form-msg');if(msg){msg.style.display='none';msg.textContent='';}document.getElementById('fdn-admin-form-wrap').style.display='';document.getElementById('fdn-admin-form-wrap').scrollIntoView({behavior:'smooth',block:'nearest'});}
function fdnAdminCancelForm(){document.getElementById('fdn-admin-form-wrap').style.display='none';fdnAdminEditRowIndex=null;}
function fdnAdminToggleTable(){
  var wrap=document.getElementById('fdn-admin-table-wrap');
  var chev=document.getElementById('fdn-admin-table-chevron');
  if(!wrap||!chev)return;
  var collapsed=wrap.style.display==='none';
  wrap.style.display=collapsed?'':'none';
  chev.textContent=collapsed?'▲':'▼';
}
async function fdnAdminSave(){
  var unit=document.getElementById('fdn-admin-unit').value.trim();
  var email=document.getElementById('fdn-admin-email').value.trim().toLowerCase();
  var firstName=document.getElementById('fdn-admin-first').value.trim();
  var lastName=document.getElementById('fdn-admin-last').value.trim();
  var type=document.getElementById('fdn-admin-type').value;
  var text=document.getElementById('fdn-admin-text').value.trim();
  var startVal=document.getElementById('fdn-admin-start').value;
  var endVal=document.getElementById('fdn-admin-end').value;
  var msg=document.getElementById('fdn-admin-form-msg');
  var btn=document.getElementById('fdn-admin-save-btn');
  function showMsg(t,ok){msg.textContent=t;msg.style.color=ok?'#2e7d32':'#c0392b';msg.style.display='';}
  if(!unit||!email||!type||!text||!startVal){showMsg('Please fill in all required fields.',false);return;}
  btn.disabled=true;btn.textContent='Saving…';
  try{
    if(fdnAdminEditRowIndex!==null){var delRes=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteFrontDeskInstruction',email:email,rowIndex:fdnAdminEditRowIndex})});var delData=await delRes.json();if(!delData.success)throw new Error(delData.message||'Delete failed');}
    var saveRes=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'saveFrontDeskInstruction',unit:unit,email:email,firstName:firstName,lastName:lastName,instructionType:type,instructions:text,startDate:startVal,endDate:endVal||'No Expiration'})});
    var saveData=await saveRes.json();
    if(!saveData.success)throw new Error(saveData.message||'Save failed');
    showMsg(fdnAdminEditRowIndex?'Updated.':'Notification added.',true);
    fdnAdminEditRowIndex=null;
    setTimeout(function(){document.getElementById('fdn-admin-form-wrap').style.display='none';fdnAdminLoad(true);},900);
  }catch(e){showMsg('Error: '+e.message,false);}
  btn.disabled=false;btn.textContent='Save Notification';
}
function fdnAdminConfirmRemove(rowIndex,btn){
  var existing=document.querySelector('.fdn-admin-confirm-row');
  if(existing)existing.remove();
  var tr=btn.closest('tr');
  var cr=document.createElement('tr');
  cr.className='fdn-admin-confirm-row';
  var td=document.createElement('td');
  td.colSpan=6;
  td.style.cssText='background:#fff5f5;padding:10px 14px;border-top:1px solid #f5c6cb;';
  td.innerHTML='<span style="font-size:13px;color:#c0392b;font-weight:bold;">Remove this notification?</span>'
    +'<span style="margin-left:12px;">'
    +'<button onclick="fdnAdminDoRemove('+rowIndex+',this)" style="background:#c0392b;color:white;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;font-weight:bold;margin-right:6px;">Remove</button>'
    +'<button onclick="this.closest(&apos;.fdn-admin-confirm-row&apos;).remove()" style="background:#eee;color:#555;border:none;padding:5px 14px;border-radius:4px;cursor:pointer;font-size:13px;">Cancel</button>'
    +'</span>';
  cr.appendChild(td);
  tr.insertAdjacentElement('afterend',cr);
}
async function fdnAdminDoRemove(rowIndex,btn){btn.disabled=true;btn.textContent='Removing…';var r=fdnAdminAll.find(function(x){return x.rowIndex===rowIndex;});var email=r?(r.email||''):'';try{var res=await fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteFrontDeskInstruction',email:email,rowIndex:rowIndex})});var data=await res.json();if(data.success){var row=document.querySelector('.fdn-admin-confirm-row');if(row)row.remove();fdnAdminLoad(true);}else{btn.disabled=false;btn.textContent='Remove';}}catch(e){btn.disabled=false;btn.textContent='Remove';}}
// -- End Phase 6 --
let resMgmtAll = [];      // full list from server
let resMgmtFiltered = []; // after search/filter
let resMgmtCurrentEmail = null; // email of currently viewed resident

// ---------- Load / Render ----------

function resMgmtReset() {
  const search = document.getElementById('res-search');
  const bldg = document.getElementById('res-filter-building');
  const role = document.getElementById('res-filter-role');
  if(search) search.value = '';
  if(bldg) bldg.value = '';
  if(role) role.value = '';
}

async function resMgmtLoad() {
  const tbody = document.getElementById('res-mgmt-tbody');
  if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:#888;">Loading residents…</td></tr>';
  // Always show list view on (re)load
  resMgmtShowView('list');
  try {
    const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'getAllResidents' }) });
    const data = await res.json();
    if(data.success) {
      resMgmtAll = data.residents || [];
      resMgmtRender();
    } else {
      if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="padding:24px;text-align:center;color:#c0392b;">${escapeHtml(data.error||'Failed to load residents')}</td></tr>`;
    }
  } catch(e) {
    if(tbody) tbody.innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:#c0392b;">Network error — check connection</td></tr>';
  }
}

function resMgmtRender() {
  const q = (document.getElementById('res-search')?.value||'').trim().toLowerCase();
  const bldg = document.getElementById('res-filter-building')?.value||'';
  const role = document.getElementById('res-filter-role')?.value||'';

  const buildingOrder = { 'East': 0, 'West': 1, 'North': 2 };

  resMgmtFiltered = resMgmtAll.filter(r => {
    const name = ((r.firstName||'') + ' ' + (r.lastName||'')).toLowerCase();
    const email = (r.email||'').toLowerCase();
    const unit = (r.unit||'').toLowerCase();
    const matchQ = !q || name.includes(q) || email.includes(q) || unit.includes(q);
    const matchB = !bldg || (r.building||'')=== bldg;
    const matchR = !role || (r.role||'')=== role;
    return matchQ && matchB && matchR;
  }).sort((a, b) => {
    // 1. Role order: Resident → Staff → Admin
    const roleOrder = { Resident: 0, Staff: 1, Admin: 2 };
    const ra = roleOrder[a.role] ?? 0;
    const rb = roleOrder[b.role] ?? 0;
    if (ra !== rb) return ra - rb;
    // 2. Building order: East → West → North
    const ba = buildingOrder[a.building] ?? 99;
    const bb = buildingOrder[b.building] ?? 99;
    if (ba !== bb) return ba - bb;
    // 3. Unit number (numeric ascending)
    const ua = parseInt(a.unit, 10) || 0;
    const ub = parseInt(b.unit, 10) || 0;
    if (ua !== ub) return ua - ub;
    // 4. Last name (alphabetical)
    const lastA = (a.lastName||'').toLowerCase();
    const lastB = (b.lastName||'').toLowerCase();
    const lastCmp = lastA.localeCompare(lastB);
    if (lastCmp !== 0) return lastCmp;
    // 5. First name (alphabetical)
    const firstA = (a.firstName||'').toLowerCase();
    const firstB = (b.firstName||'').toLowerCase();
    return firstA.localeCompare(firstB);
  });

  const count = document.getElementById('res-mgmt-count');
  if(count) count.textContent = `Showing ${resMgmtFiltered.length} of ${resMgmtAll.length} residents`;

  const tbody = document.getElementById('res-mgmt-tbody');
  if(!tbody) return;

  if(!resMgmtFiltered.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="padding:24px;text-align:center;color:#888;font-style:italic;">No residents match your filters.</td></tr>';
    return;
  }

  const rolePill = role => {
    const map = { Admin:'#2a3a55', Staff:'#556b8a', Resident:'#4a7c59' };
    const bg = map[role]||'#888';
    return `<span style="background:${bg};color:white;padding:2px 9px;border-radius:10px;font-size:11px;font-weight:bold;">${escapeHtml(role||'—')}</span>`;
  };

  tbody.innerHTML = resMgmtFiltered.map(r => {
    const fdnBadge = r.fdnCount
      ? '<span title="' + r.fdnCount + ' active Front Desk Notification' + (r.fdnCount > 1 ? 's' : '') + '" style="display:inline-flex;align-items:center;justify-content:center;background:#e07b00;color:#fff;font-size:10px;font-weight:bold;border-radius:50%;width:18px;height:18px;margin-left:6px;vertical-align:middle;line-height:1;flex-shrink:0;">' + r.fdnCount + '</span>'
      : '';
    return '<tr style="cursor:pointer;" onclick="resMgmtOpenProfile(\'' + escapeHtml(r.email||'') + '\')" onmouseover="this.style.background=\'#f7fafd\'" onmouseout="this.style.background=\'\'">'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;font-weight:500;">' + escapeHtml((r.firstName||'') + ' ' + (r.lastName||'')) + fdnBadge + '</td>'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;">' + escapeHtml(r.unit||'—') + '</td>'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;">' + escapeHtml(r.building||'—') + '</td>'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;color:#555;">' + escapeHtml(r.email||'—') + '</td>'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;">' + rolePill(r.role||'Resident') + '</td>'
      + '<td style="padding:11px 16px;border-bottom:1px solid #eef0f3;"><button onclick="event.stopPropagation();resMgmtOpenProfile(\'' + escapeHtml(r.email||'') + '\')" style="background:none;border:1px solid #b3d1e8;color:#2a3a55;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:bold;">View</button></td>'
      + '</tr>';
  }).join('');
}

// ---------- View switching ----------

function resMgmtShowView(view) {
  document.getElementById('res-mgmt-list-view').style.display = view==='list' ? '' : 'none';
  document.getElementById('res-mgmt-profile-view').style.display = view==='profile' ? '' : 'none';
  document.getElementById('res-mgmt-add-view').style.display = view==='add' ? '' : 'none';
}

function resMgmtBackToList() {
  resMgmtShowView('list');
  resMgmtCurrentEmail = null;
}

// ---------- Profile View ----------

function resMgmtOpenProfile(email) {
  resMgmtCurrentEmail = email;
  const r = resMgmtAll.find(x => x.email === email);
  if(!r) return;
  // Populate read-only
  document.getElementById('res-profile-header-name').textContent = (r.firstName||'') + ' ' + (r.lastName||'');
  const fields = ['firstName','lastName','email','unit','building','parking','role','cell','other'];
  fields.forEach(f => {
    const el = document.getElementById('rpv-'+f);
    if(el) el.textContent = r[f] || '—';
  });
  // Display positions
  const posEl = document.getElementById('rpv-positions');
  if(posEl) {
    const pos = Array.isArray(r.positions) ? r.positions : [];
    posEl.textContent = pos.length ? pos.join(', ') : '—';
  }
  // Hide edit/confirm panels
  document.getElementById('res-profile-readonly').style.display = '';
  document.getElementById('res-profile-edit').style.display = 'none';
  document.getElementById('res-deactivate-confirm').style.display = 'none';
  document.getElementById('res-profile-edit-btn').textContent = '✏️ Edit';
  document.getElementById('res-reset-pw-input').value = '';
  const msg = document.getElementById('res-reset-pw-msg');
  if(msg) { msg.style.display='none'; msg.textContent=''; }
  resMgmtLoadFDN(r.email);
  resMgmtShowView('profile');
}

async function resMgmtLoadFDN(email) {
  const body = document.getElementById('res-profile-fdn-body');
  if(!body) return;
  body.innerHTML = '<div style="color:#aaa;font-style:italic;font-size:13px;">Loading…</div>';
  try {
    const res = await fetch(WEB_APP_URL, { method: 'POST', body: JSON.stringify({ action: 'getFrontDeskInstructions', email: email }) });
    const data = await res.json();
    const instructions = (data.instructions || []).filter(function(r) {
      if(!r.endDate || r.endDate === 'No Expiration') return true;
      var d = new Date(r.endDate);
      if(isNaN(d)) return true;
      var endUTC = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
      var now = new Date();
      var todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
      return endUTC >= todayUTC;
    });
    if(!instructions.length) {
      body.innerHTML = '<div style="color:#aaa;font-style:italic;font-size:13px;">No active Front Desk Notifications.</div>';
      return;
    }
    instructions.sort(function(a,b){ return new Date(b.startDate) - new Date(a.startDate); });
    var rows = instructions.map(function(r) {
      return '<tr>'
        + '<td data-label="Effective Date">' + fdnDisplayDate(r.startDate) + '</td>'
        + '<td data-label="Type &amp; Instructions"><span class="fdn-type-badge">' + escapeHtml(r.instructionType||'—') + '</span><br><span style="font-size:13px;color:#444;margin-top:5px;display:block;">' + escapeHtml(r.instructions||'') + '</span></td>'
        + '<td data-label="End Date">' + (r.endDate === 'No Expiration' ? 'No Expiration' : fdnDisplayDate(r.endDate)) + '</td>'
        + '</tr>';
    }).join('');
    body.innerHTML = '<div class="fdn-table-wrap" style="margin-bottom:0;">'
      + '<table class="fdn-table" style="font-size:13px;">'
      + '<thead><tr><th>Effective Date</th><th>Type &amp; Instructions</th><th>End Date</th></tr></thead>'
      + '<tbody>' + rows + '</tbody>'
      + '</table></div>';
  } catch(e) {
    body.innerHTML = '<div style="color:#c0392b;font-size:13px;">Could not load Front Desk Notifications.</div>';
  }
}

function resMgmtToggleEdit() {
  const editDiv = document.getElementById('res-profile-edit');
  const readDiv = document.getElementById('res-profile-readonly');
  const btn = document.getElementById('res-profile-edit-btn');
  const isEditing = editDiv.style.display !== 'none';
  if(isEditing) {
    editDiv.style.display = 'none';
    readDiv.style.display = '';
    btn.textContent = '✏️ Edit';
    return;
  }
  // Populate edit fields from current resident
  const r = resMgmtAll.find(x => x.email === resMgmtCurrentEmail);
  if(!r) return;
  ['firstName','lastName','email','unit','building','parking','role','cell','other'].forEach(f => {
    const el = document.getElementById('rpe-'+f);
    if(el) el.value = r[f]||'';
  });
  // Populate position checkboxes
  const posContainer = document.getElementById('rpe-positions');
  if(posContainer) {
    const currentPos = Array.isArray(r.positions) ? r.positions : [];
    posContainer.querySelectorAll('input[type=checkbox]').forEach(function(cb){
      cb.checked = currentPos.indexOf(cb.value) !== -1;
    });
  }
  const msgEl = document.getElementById('res-edit-msg');
  if(msgEl) { msgEl.style.display='none'; msgEl.textContent=''; }
  readDiv.style.display = 'none';
  editDiv.style.display = '';
  btn.textContent = '✕ Cancel Edit';
}

async function resMgmtSaveEdit() {
  const fields = ['firstName','lastName','email','unit','building','parking','role','cell','other'];
  const updates = {};
  fields.forEach(f => {
    const el = document.getElementById('rpe-'+f);
    if(el) updates[f] = el.value.trim();
  });
  // Collect positions from checkboxes
  const posContainer = document.getElementById('rpe-positions');
  if(posContainer) {
    updates.positions = Array.from(posContainer.querySelectorAll('input[type=checkbox]:checked')).map(function(cb){ return cb.value; });
  }
  const msgEl = document.getElementById('res-edit-msg');
  if(!updates.email) { msgEl.textContent='Email is required.'; msgEl.style.display='block'; msgEl.style.color='#c0392b'; return; }
  const saveBtn = document.querySelector('[onclick="resMgmtSaveEdit()"]');
  if(saveBtn) { saveBtn.disabled=true; saveBtn.innerHTML='<em>Saving...</em>'; saveBtn.style.background='#4f6d8f'; }
  msgEl.textContent = ''; msgEl.style.display='none';
  try {
    const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'adminUpdateResident', originalEmail: resMgmtCurrentEmail, updates }) });
    const data = await res.json();
    if(data.success) {
      if(saveBtn) { saveBtn.disabled=false; saveBtn.innerHTML='💾 Save Changes'; saveBtn.style.background=''; }
      msgEl.textContent = '✅ Saved!'; msgEl.style.color='#2e6b1f'; msgEl.style.display='block';
      // Update local cache
      const idx = resMgmtAll.findIndex(x => x.email === resMgmtCurrentEmail);
      if(idx>=0) resMgmtAll[idx] = { ...resMgmtAll[idx], ...updates };
      resMgmtCurrentEmail = updates.email || resMgmtCurrentEmail;
      setTimeout(() => resMgmtOpenProfile(resMgmtCurrentEmail), 800);
    } else {
      if(saveBtn) { saveBtn.disabled=false; saveBtn.innerHTML='💾 Save Changes'; saveBtn.style.background=''; }
      msgEl.textContent = '❌ ' + (data.error||'Save failed'); msgEl.style.color='#c0392b'; msgEl.style.display='block';
    }
  } catch(e) {
    if(saveBtn) { saveBtn.disabled=false; saveBtn.innerHTML='💾 Save Changes'; saveBtn.style.background=''; }
    msgEl.textContent = '❌ Network error'; msgEl.style.color='#c0392b'; msgEl.style.display='block';
  }
}

// ---------- Reset Password ----------

async function resMgmtResetPassword() {
  const pw = document.getElementById('res-reset-pw-input').value.trim();
  const msg = document.getElementById('res-reset-pw-msg');
  if(!pw) { msg.textContent='Enter a new password first.'; msg.style.color='#c0392b'; msg.style.display='block'; return; }
  msg.textContent='Resetting…'; msg.style.color='#555'; msg.style.display='block';
  try {
    const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'adminResetPassword', email: resMgmtCurrentEmail, newPassword: pw }) });
    const data = await res.json();
    if(data.success) {
      msg.textContent='✅ Password reset successfully.'; msg.style.color='#2e6b1f';
      document.getElementById('res-reset-pw-input').value='';
    } else {
      msg.textContent='❌ ' + (data.error||'Reset failed'); msg.style.color='#c0392b';
    }
  } catch(e) {
    msg.textContent='❌ Network error'; msg.style.color='#c0392b';
  }
}

// ---------- Deactivate / Remove ----------

function resMgmtDeactivate() {
  document.getElementById('res-deactivate-confirm').style.display = '';
  document.getElementById('res-profile-readonly').scrollIntoView({behavior:'smooth',block:'nearest'});
}

function resMgmtDeactivateCancel() {
  document.getElementById('res-deactivate-confirm').style.display = 'none';
}

async function resMgmtDeactivateConfirm() {
  const confirmDiv = document.getElementById('res-deactivate-confirm');
  const removeBtn = confirmDiv.querySelector('button[onclick*="resMgmtDeactivateConfirm"]');
  if(removeBtn) { removeBtn.disabled=true; removeBtn.innerHTML='<em>Removing...</em>'; removeBtn.style.background='#4f6d8f'; }
  try {
    const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'deactivateResident', email: resMgmtCurrentEmail }) });
    const data = await res.json();
    if(data.success) {
      // Remove from local cache and go back to list
      resMgmtAll = resMgmtAll.filter(x => x.email !== resMgmtCurrentEmail);
      resMgmtRender();
      resMgmtBackToList();
    } else {
      confirmDiv.innerHTML = '<div style="color:#c0392b;font-size:13px;">❌ ' + escapeHtml(data.error||'Failed to remove') + '</div>';
    }
  } catch(e) {
    confirmDiv.innerHTML = '<div style="color:#c0392b;font-size:13px;">❌ Network error</div>';
  }
}

// ---------- Add Resident ----------

function resMgmtOpenAdd() {
  ['firstName','lastName','email','password','unit','building','role','cell'].forEach(f => {
    const el = document.getElementById('ra-'+f);
    if(el) el.value = f==='role' ? 'Resident' : '';
  });
  // Reset parking tag UI
  const tagsEl = document.getElementById('ra-parking-tags');
  const inputEl = document.getElementById('ra-parking-input');
  const hiddenEl = document.getElementById('ra-parking');
  if(tagsEl) tagsEl.innerHTML = '';
  if(inputEl) inputEl.value = '';
  if(hiddenEl) hiddenEl.value = '';
  const msg = document.getElementById('res-add-msg');
  if(msg) { msg.style.display='none'; msg.textContent=''; }
  resMgmtShowView('add');
}

// ---------- Parking Space Tag Input Helpers ----------

function raParkingInput(input) {
  // Strip non-digits; if space was typed treat it as a commit
  const raw = input.value;
  const hasSpace = raw.includes(' ');
  const digits = raw.replace(/\D/g, '');
  input.value = digits;
  if (hasSpace && digits.length >= 2) {
    raParkingAddTag(digits);
  }
}

function raParkingKeydown(e) {
  // Prevent space from doing nothing (some browsers swallow it before oninput)
  if (e.key === ' ') { e.preventDefault(); }
}

function raParkingKeyup(e) {
  const input = document.getElementById('ra-parking-input');
  const digits = input.value.trim();
  if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
    e.preventDefault();
    raParkingAddTag(digits);
  } else if (e.key === 'Backspace' && digits === '') {
    const tagsEl = document.getElementById('ra-parking-tags');
    if (tagsEl && tagsEl.lastChild) {
      tagsEl.removeChild(tagsEl.lastChild);
      raParkingSyncHidden();
    }
  }
}

function raParkingAddTag(digits) {
  if(!digits || digits.length < 2 || digits.length > 3) {
    if(digits.length > 0) {
      // Flash the wrap red briefly to signal invalid
      const wrap = document.getElementById('ra-parking-tags-wrap');
      if(wrap) { wrap.style.borderColor='#e74c3c'; setTimeout(()=>wrap.style.borderColor='#dde3ea',800); }
    }
    return;
  }
  const label = 'PS' + digits;
  // Deduplicate
  const tagsEl = document.getElementById('ra-parking-tags');
  const existing = Array.from(tagsEl.querySelectorAll('span[data-ps]')).map(s=>s.dataset.ps);
  if(existing.includes(label)) {
    document.getElementById('ra-parking-input').value = '';
    return;
  }
  // Build tag chip
  const chip = document.createElement('span');
  chip.dataset.ps = label;
  chip.title = 'Click to remove';
  chip.style.cssText = 'display:inline-flex;align-items:center;gap:4px;background:#2a3a55;color:#fff;font-size:12px;font-weight:700;padding:3px 9px;border-radius:20px;cursor:pointer;user-select:none;';
  chip.innerHTML = `${label} <span style="font-size:14px;line-height:1;opacity:0.7;">×</span>`;
  chip.onclick = () => { chip.remove(); raParkingSyncHidden(); };
  tagsEl.appendChild(chip);
  document.getElementById('ra-parking-input').value = '';
  raParkingSyncHidden();
}

function raParkingSyncHidden() {
  const tagsEl = document.getElementById('ra-parking-tags');
  const labels = Array.from(tagsEl.querySelectorAll('span[data-ps]')).map(s=>s.dataset.ps);
  document.getElementById('ra-parking').value = labels.join(', ');
}

async function resMgmtSaveAdd() {
  const get = id => document.getElementById(id)?.value?.trim()||'';
  const firstName = get('ra-firstName'), lastName = get('ra-lastName');
  const email = get('ra-email'), password = get('ra-password'), unit = get('ra-unit');
  const building = get('ra-building'), parking = get('ra-parking');
  const role = get('ra-role'), cell = get('ra-cell');
  const msg = document.getElementById('res-add-msg');
  if(!firstName||!lastName||!email||!password||!unit) {
    msg.textContent='Please fill in all required fields (First Name, Last Name, Email, Password, Unit).';
    msg.style.color='#c0392b'; msg.style.display='block'; return;
  }
  msg.textContent=''; msg.style.display='none';
  const addBtn = document.querySelector('[onclick="resMgmtSaveAdd()"]');
  if(addBtn) { addBtn.disabled=true; addBtn.innerHTML='<em>Adding...</em>'; addBtn.style.background='#4f6d8f'; }
  try {
    const res = await fetch(WEB_APP_URL, { method:'POST', body:JSON.stringify({ action:'addResident', firstName, lastName, email, password, unit, building, parking, role, cellPhone: cell, notifications: { email: true, text: true } }) });
    const data = await res.json();
    if(data.success) {
      if(addBtn) { addBtn.disabled=false; addBtn.innerHTML='✅ Add Resident'; addBtn.style.background=''; }
      msg.textContent='✅ Resident added!'; msg.style.color='#2e6b1f'; msg.style.display='block';
      // Add to local cache and return to list
      const newR = { firstName, lastName, email, unit, building, parking, role, cell, other:'' };
      resMgmtAll.push(newR);
      setTimeout(() => { resMgmtRender(); resMgmtBackToList(); }, 900);
    } else {
      if(addBtn) { addBtn.disabled=false; addBtn.innerHTML='✅ Add Resident'; addBtn.style.background=''; }
      msg.textContent='❌ ' + (data.error||'Failed to add resident'); msg.style.color='#c0392b'; msg.style.display='block';
    }
  } catch(e) {
    if(addBtn) { addBtn.disabled=false; addBtn.innerHTML='✅ Add Resident'; addBtn.style.background=''; }
    msg.textContent='❌ Network error'; msg.style.color='#c0392b'; msg.style.display='block';
  }
}

// Inline styles for res-field-group used in profile readonly view
(function injectResMgmtCSS() {
  const style = document.createElement('style');
  style.textContent = `.res-field-group{background:#f7fafd;border:1px solid #e8eef4;border-radius:8px;padding:12px 14px;}.res-field-label{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px;}.res-field-val{font-size:14px;color:#1a2b3c;font-weight:500;word-break:break-all;}`;
  document.head.appendChild(style);
})();

// ============================================================
// LIBRARY FEATURE
// ============================================================
const LIBRARY_SECTIONS = [
  'Board of Directors',
  'Building Documents',
  'Financials',
  'HoA Rules & Regulations',
  'Newsletters',
  'Vendors'
];
const LIBRARY_SECTION_ICONS = {
  'Board of Directors':     '🏛',
  'Building Documents':     '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGAAAABgCAYAAADimHc4AAAoNUlEQVR4nO29y49lWXbe91tr73NuROS78l3VVVndRTbJZlOkKBuWKAs9EQxDGmhEw3+BBAkQPPFEA6m6IEGgZqI0aECeGoZkaqSZBEEmYAsQJTZJd5P9KtYrs/IVGZnxjrj3nL3X0mDtcyIys0hI3WGLgGIDWRkZ995z93Otb33rW7vgvJ2383beztt5O2/n7bydt/N23s7befuvqcl/4u/+SzT//+i5fxLG90eOTf//7MUf3341nfED/wSN7f25L6/tBhH4Z//4/YvL44vObYDbwNNT77j9ym+exj/m9576xNOncPv2K98wv/kLfh9/HR986H/tg39y9J83qD+2CeAC/J2/8TcuvvflL/sXduGPbdMHnn7xz0+fnnrb6Rl6ebaOPzrwv/bBB/PYYgHef1/54AP7hT/zZ3/Zqv+TlBdvCoIKish8XtwNJ7aSiOBJwR2KgSREFCiIggFufupLUtuDjldHRObVd42fRMTN3LGRDv+nf/kv/cX/9YMPPoB43I/V3n//ff3ggw/sz/x3f/6/L4P/ek1+N+c1cTPBHXFBZOql4A6Io9K+VD1eswQYTo2+qsb7rcYciCKn97MbjkBqv3Vxd7fkhmr93//y//gX/9YHH3wwf0Id/Ou/+Gf//Yr+vxlLiQkSmZcpuiExgW7tZ217izg6OLidLK3HtovntD/u8VL7W0RwOem4AJhwYZHoOfwrv/3bv/UvfvVXfzX9xm/8Rv0x10C+8Y1vpM2d4Tuu/c8NdQR03lTymhFwROJ1d493CoiBI7h467sgophY+7ee9L89J8bfvkEk5sactV7J5egvfOc73/5/tH3G8PdFVDpzM1UpqriIuwiu4Ck2qquIJ02uKi6YCx7vo7afxUXEVTTe2/5WcMVd5eS5ouKIu+Cu7W/BXLQOQ7V6NNrPAWxubv64jlMAH8dxvZZ6YxwHUzDV1icRb+s//1HV9rO7Ki6IC+5J3LO7J8RV1RVc3FyR+J3QxoaL0uaAV/6IKzrWKna0Gr8KkE/6+k2v9q9GcdSKuWnYBW+nXzx2hqY4ptWcME7TH8FxVAVRodaKVUdU4hT4yYwkbZ80m0+Zxd5D3FFMXVPqcjf8mBP/Uuu6zlGr4qpjMRetInJ6rzq4o0nxahRzFGkH1kGM0SCTERHGOsbpEI0DL4K4AUZKGRxqbQe2fY8icVJEJKFKrfLSAnzzm/9T587tcTVw9c4tufHuu1idpqySVdm8/4Cdp4/Jqefu22/T5Rz2DyApq2Fg6/PPqcPItdu3uf6ldygY4oKiqMDTB5+y/3ST3Hfcefsdcu5wj8VDYFytePrwYfgbPTvIaILUYly9fp3L16/hxQBBUtjzradPONjbo+t63v2Zr5IXa+BGxVHtGA4OefTRj2AcuXTzJne+fA8rFZfYOAtJbH5+n+dPH9P1PXe/9A7a52lvkhDG1cDjxw8xr9RXFwBANLlrZXH5IutXLzGMbZUxur5nY3eP5w/vs1hbZ+PyJQRBPex4VdBFT06JMgxsXL7KhevXWY2rsPMupJRZ33nB7uMn5NSzdvlyOB83jHCIue9JqQOrYPmL5vI/u90CnohSxFm/sMH6hQuU0dqZdbq+Y33jArsvtlm/sMblG7cYm/PNxCZeW1/w7H5mGI+5eO0Sa29cZ1itUHXcoU8L1nb34fFDcu7YuHwJRKkYIo660i0W9E8VdUNz9/oCxE5PqHSYO7WucCYIEkdINaGiSNsdxRwVwVHwE5NSvTKWkTqOcZSbU3eXGLgbtVZqO+aGk9D2HY4apB8f/LzUNqGdVKG6UcyoXolvFaiGT98nUNyopTQHC5oyeQIe7cDXOlDrgFn02V2oVmjgCHNH3JoJD8ddJ2QkMgclLy1AWHMDjwl1EjZZelc8DAkuYAKmgonjzR/EcfToo9DeJygN8aggOr2ntomnnSLFdIJUFsf0DINWP+kZhuPiiCYwD3TjjnhtWE1A2sQ2/1A55Q/NA526Etg6djlyMuFhegx1xxBM4rkTipq21ssnQKIjeCVJIqeEqoJD7rrA927hbKcdLYoGxKFWby7B6ETpc6a4kSTWO6U0Q1gHVARNOmM3SYqZYoTTPys2IkxQmEpVpUuJwtR/R1sXTBJqoAqaM+oaEF8U6oDjWIPZXe4oZohm3MNHZokTIh5j0bb0qe16qpEcqhtjiyde9gHuiCqHu7usPdui1IqIIqp0ueNwZxvJgpXK4fYeqYuPK4IjDGVFNUNT4mB7h/7CMwabgi5hCSy392Ki3Tjc2yf3mTqdEEmUoWDF6FQwOyM66BbITuzt5cERXb8Ic9DgmQDLoyMkdYzDir2nT/FFz3RuEpl6dEwdK5IyB/v7rD17Rq0V14TjZIHjnV2y9NhYOdzZJeXE5IUTQhnHME16wrK8bIIaFDvY3uLg+YvYIXFg51i+ywmzwubnn7cAI4ISQ3E1VJTc9+y92GLv2VYEWR7LhDiok7qMm/H080+bXW0WMeI0kjoiGeXHjb1eaZtgYwx8/8U2By92cLHokwomFTdHVRmtcP+HP0DtJEhzCeMlSchd5vD5FgdbWwT+SQFDEVwq2meqVZ4/eIirU9VRD/5gilc7TXQpvb4AAGrhKKvYbP/cHbVYHJKi7rMDnQNgAE9ImiLd+I+atejEMG/4mhTPLR47Qpq5abuRtkOSnh1/pilgsNfK4DX2gihWYwGSCiJd+ISG4We7H+E8iYTM1sRQAazEIqFIEtwr0hy5l5j4QPMxTs0yQfcvgKGimDtrl69w6dZN3GqYD1U6zew83eRw5zkiiRvvvENa6yeYCyKU1Ypnjx4itbK2vs6ly1caBTZ/AQd7+wyHh6gmbnz5HqnvGooI81dXAy8efo6FJzij6b+F6hPcCxeuX2fjjatYbXEAAY+3nz7meHeX1GVu3LqNiGAWuz/ljA0j2y9eUKuzWNvg2pUrs8k2r6goB7sHrI72kZS59c498lpPbT5RgfF4yfPHD8GdUhleWwAXpdjIrVs3ufneewyrY5CMAF3fYwh7z7ZYXF7n5nvvoTkFjMRQcRgKu1ubDIcDVy5d5dqd24wlFhGPgYjD5t4e3UY8w1NEv26NMyqVvc1N3JbzSTiL5mrU0bl6502uvnVn7peZsegX1GocPH/O2sULvHH3DtXaBtDmrIfC/t4eq+Uxly5f4erdO9RaUUmYGzkJgnJ8sMNifYNb730F6ZRqJcbm4KWwvfUM94Gcpb6+AA2dmDl1HKljbb8PDFutMYEItRaKOeaVhtrwUmJXoFRRSjWslkARZg3TOCIGYpRhwDoFr0zRhtYUsbefkQMGNtkMaqAaVkaGUijFyJoYa8EwSllCM5N1VWnkFWoeYKBMwLGCGm61xQoVNwPvmz9zTJzVuMJNA/VN5piA4lTH3ctrCzBxljETYXpwm6GY+YSmPcg9NTBrB7lDsNlZRxzgmPrMEyot1mg7ApkwczNkwkwahS84Ox/gHnGHKw1C0yBl81kWlLK1WGVmeVtnXCcWePp39NVwUGZG1+ZY7WW/pinFxGON35fV6wvQnNPpRYhnCFnCARUpzTEFUklJT2ZU50QAKkaS1Loxwb1YRJsxedcQVqO58TBlClLlJ8gCvN5UEyIRvTOBARGSKlmUnHrEheQR20zRf+QLHJcpyo9YJ/itFKfBBVXHpM57SERRTWDaIk1FKEhEd9hQbr62ALgiYozHS+xohdWKNobSqlEOjkgkrFTGg2NkLRCBmOPJKKsltcaJGJcr6jhQaoOx7ogpZRxJSbFSGQ6PkT4jFpMiKRx5HUZEwn6eRbt1CzZ3M6JGPR6oy4GxWItPHOucYViizQeVYcDaCRCgkxTIyEA0UVcjdRljk6S4OWkcqcsx6JSxUo8OSOsb1FIxd1ISWA1ordMpstcXAOhzz87mY3afPWsM5ZR8AbfKRu6wUvjsD35/Du0lPGgYIHdS7tjf3WP/YB8ssjJT1FmsknNHLYVPf+/bzQmDuiIuVApmhUXq4KziAOJ8pZzZfnif3YcPIrpxRyUhqpRSSH3HWAYefvyHMWJvI9dm272SU2Z/Z5uDvf1ApwStHsFoRXPGauX+738XkUz18YTCMahW6bNizbq+QkWAZoUyMq6Omy1y1CVWcZEpGdTAyiooXTdqCsSQpEdyCk6oVspQGw8koAmThp0lulvKiJSgu821HeW2q86OBmpDC3NitTC0XSgiFEqMUVMEVTjjWAK1NPgYPk/IuQOCaLRhnAm1oGcyudPwjeLUseI2IFTUnSKKkJGsnD7XLy2AMQY6WKxz4caVFoYL6rED9vd2KcMxBqxfvUrXr7XTEYFWWQ0c7b4AcbrFOpduXI4ApS2kAce7O9hqQES4dOVqBFsN8bgopQysDo+CdznLSLgGWunXNujWF0gNs2gaROPy6CiQn8DF6zfIfd9SkoAK5XjJcncPx5DFOpevXCV52KlKxAPHL/ap4yGIcOHqdbpFjzfuSKSjrAYOd1+QRKlfGIi5MJSRu/fe5c2vfJVhXM3HT1Nm85OPefKjH7G4cIl7X/tT0OeWiG9ZpWHko9/+LZZHB9x99y633vspVkMk6XEn5wVPP/wRTz76QzYuXOSte/eAOF04kberhc8//AR8xOzs6OhqhYpw48ZbXLl+nTqWOeulknn2+BFbTx6wfvkaX/6Fn6dmJbWIXRWG4xUf//a3WR3tceede7z51Z9lNazC9LqzWCzY+sNPefDh77Nx8TL3fuEXkS41YYIEUhoGPvwP/w5xI6fF3msLAEqOPctoA6s6opVGISikBOLkFIRCqSNup+1kQUVREq6JsQavjnq8T2qDmeHdSq0RSXujaUs7J+pIbd95Bu0Wt3icHqAt3KhlpFbDZUIxQb4rQVlM+YBqKXguAakNw4uSuo7BCqWOc8S8EsFT2E2RNMdSM+lgQm40RUOJOWb8VJsoBZFwiILSkomkAM6EuQn0cyLECHo6CCefJ3nCzIJErtgDwrkYFWsk1oyYG4ckVB9BodPuTBaAW5BTivw0p1QN0XVEFW9+p0pFSKhlsIgP1GU2xbH1Yl5ENOC0xPjcLBDn7OCVJBqfP6W0iNMeDOQrbGhqCfdK8YK1wCNIuRp8dzsR5oaRMXEEo0gQ6VVighOE/bNIfoDg6i1Ki463cCKSI1NquSU63B1dnK2YzWn5B4I08wi5MW14zr3ZgEgISUs+ubToFwOv8VnCZ7lGkKd4Y00bf6wBLpzaGMtYqERL2g++9toCSKhE8Bamu0JqkV1qUE0lXqcaudNGITtohqHOzKgXI4lQU2p5U48FtCZ6MsPMSEmDGm6kn401FsX97AKxzc2T3IIZWZVBK6QwK5pi9yKCl4oUp+u6GIuAqlJWy9kn2bgiSzCgtIxXNqDUYH5Pscc+cewiwZw2OoeIUU8vwNdAHqC9sv3kIUf7O5GVcm8PFYbjI7RP1DLw2Xe/iyyCt4lMp2KDY2Ohy5mtR4/YfbETux5vEbYwHB/T9x1eC4/vf9aOpjWbZkEP+IBqPrtA+Bb4dgSCzx8/5uD5dkS7GpsOc1arFbnrGVZLPv3ud+hTjt0sFSfhY8HNyH3P9pMnHOzvx6LNsZBQliv6foENA/e/+3tIIxpBEEnUWhmssJZPpv3UAnyvUcJgNnC4s0LMMSxYHNeIETQDwvJwD993ZNo5AqQctlaEWlaM24cx+c1vIJBzD5rCbC0PGUt7LeJ7NGk4u3RWLhg2NwlIm4RqzuHRUThPCZOCGZpzOFicYX+X0WLjGTXSliKk3AGJWgfG7WWLFXyWNooqSROCs5w2MIZ7iwGSzTmOied9xQco1SuQWKwtgvVsaQmInZ9wahV0bSPQkEHBUFVqqZQykFvglS9dIOxtm1wRynJAmpZU19bnrNtkI82cujoGaDmBs2niGuaz68kbay0xXhuBGCbGzTCHvH4BSWnmqBAPVDQMIEFB94v15gdOxTBjATNMhLy+NiOe0M06tRZsKKEYqV+UExZRK3D1+jVu330rIGRj51Q7tjafsv34CYu1Be/87M8EzvXQ3akqthz55Ht/wLg65s2v3OP6vXushoBe1S2w8kef8PSTj+gvXuK9P/1LEfW6tXhCqcPAR9/+NnUYGRdnswC3uMVmesRqHLnz5Xe58fbblGFgCg67ruPxhx/y7LOPWLt4hZ/+5V/Gk2IeBlZVKYdLPv7O71DHkWvXb3H99m3GWpqY0kk5sbP1nO3Nz+nWL/LlX/ylmJ8aY8gpMQ4rPvzd38H9JMCcT/k3v/m1kkS3lETOixBvAq7KlIdLqQsJigrkHJ4+aaT23JGcgmgToOtAE6nL9F1Hbv/WrLiUgKUptdiix8m4JLTrISsiTscZJWRuAQLVBc09VaGIgHQ4IdjSrHhxNHWQlRriWFyVgqB9T5KMVYGcArZq5JQ1KZqU3E26pgTaYykjfY/nzKiC9Gsxd+5BT59egN/8TdTxjSasEj+VQMGZ5eSRPpzJWrxGIJPaA90LNMVwEiXRmGpokgyfiTAzwa2RPj5RvXWOG87KCWxubmLWILXbzHLSFNpTJmSKR8ytIZ4Yu8oU7XASu/gE97xNpDStUMQOIVuPn6fTLR4KuYCjMbjZBP3mb35PDd8QE3DBSDglXKjTkuuOTHUAVqmSmWTXtQa0xCdtkUe0WYMrqXJCSYgraEM/dXLSgflCUSZzvHBWTZsaLeIcwMIxV5zOO5AckBoikyWB7k4WyZsOK+bBptVqWabIc4S1MHEqhpoDpfmBrrmTeFpt/m1egDffvObwsLgHq5A7xSQjTf2WuxySxDaILmU8dVSN9KJIIpNaFA1JhJQjTNckJM+k3KMpNbpCWHRhDkK5Es+QVTjl6fydRbt16xZb+48JrqPS50Sx6YQWFlnBCpYMobLW9ZQkLQ3rgVyaTEUsUFvXh+miBZQpJxrVC0CfFO0Up4+zJQnxEWn2P71KRz96tC0RtcLe9halLsED5ZhEwHK8v4+mSF48+PhjutxRiQxXVkFHw8dKn3u2nzxieXQY6rFgWdCkHO5sk/rEOCx5+IPvY7mdBHeyZHwYsXGgy9oS4z9529zcpJaCCLx4eJ/V4QGTFN49BAU72zv0eY1xueKT738v/BAhxU8CZRgYxxWShP3tHayEmWkJWlSU4eiQnBM2rnj8hz8M+98smSjYsGIoI7mXOUX+Mh3trqKJYbXk+OkBeJoZQzxOqWcHN3aebTZNZwoU1LhzzRkRWB3vc7y/Fw92AVeQimhCkiJW2X78+Uz5eosoEehSIklH0rM7BVYrkhOr4yOO948i9ekjWMKIE560Qxx2Hz/AsMb7SENpIF0Ghbpasn20bOVL1uoflKy06NfZ2dwMfzZR7aTIRSsEA8zrSfnJCKqk0HFOKqRYnVjxJsbV3JNETzScktokTrLvmGja3If906Z2stBm5sA5gaJOeKfqZ2mAAgRtauhBixspt02jmVQlwIBUkIKZILkPdV5zzOKOlBqCCFUKHlR8cKVBOBqNVg/mN0mHpK6ZUgtfUSeSUlAPNvS1lKSZce36dd64eZ1SKtaqWbIoz59tsvt8i67ruff1r5G6BbVll1Q7ynLg/g9/n1KW3LzzFtfffptVGXFtuoncs/XJA54//ZRubZ13vvbzaN9FpopwlL4c+PR736XUwniGgViXOoahcuedd7nx1l3Gsc4AIifl8aefsf34EevrF7j39a/huQvi0UI1V5cr7v/wB9ThmGtvvsXtd99hGAZcIgO4rj1b9x+y+fgT+n6dN9+6h3aJKk2OIlDGwqP7nwlupC5tv7YAQcYJuV+Q+gWkysRC55xZrK/jFfLGgguXrlFVyB7IyJOSNiLhXlbO4vIl+quXkXESQDmpz/QX1oJTyT3rl69imgAJ6CaOdOuo9lCXoTo4o1Ys9D8bl67QXbqGjKsGhY1urWdxcQMrhuYF/YUrVJFZ9ZxShgsjqU+sVs7axUssLl3Dh1UgQnfyoqfb3cU+r6BCd3EdSdomOHZ97kEku9tIHbn62gKEfhEmnnhiCOefiSMIUGuIW0PpX09MVDuGZqGk8KYwcw+OyRhm7sRqGKyTPINRzTAJJpVWvnomTQANQZmVElE+zfeU2ljYKNowC3rRcFLLDVstbT7CStRqWLWQLplTSolYo+UMvMF2fGKjw8y6F4SKiH2BKsKVE0b7JFiZmnmNhLRHvaw7TZrY3mc+BzPu1nZYZMkCWOcI3ds3WJsAmKpPQhdkLSHUnVUYcAvSXkJL9L22IEnaArv7nHhxJlgcM1A9cskRd0nD/LFYsTFj06knWkVZs/o16icnFCkhYKDJFGp9JQ5o20S8bTztFNegm33CuRI2EYzUKZa7JsdgzjDpZO81kXIXNJvGQHJO9ClNKnX6vmNURa05M43ATNuJG89GFgQQ+iR3smoUzzWeH3O6RUfKimns+5wS5DRntkwSOhwhbogbSSNfYA5oKLy7ridpk6Ar5C6HEqSe+IAgEJpOUOheWoBvfvP/HH/jX/yFZ1L87cO9A9e8FfrM0FmQRFjuHZFzTy2FzQcPSTkTetKgYmUc8TFkJTsvnuNdZlVKA3NCSsrB8x1yypRh4Nmnn0HftcAs+AEbBmwcSBo557Nq5gVQDrefI1kYxtqkgk7OmYPtHVKXGYYVT+5/hnYp5OoTxBmWWK0kzextvSD396k1tp5JaP6Ptp7TdYk6FvY2n6M5h6RU4mTXMlDrkpQTxitxQE7Jf/aX/vxKVTjeP+Rwfz9eaDkCFyFJpmvs5dOPPsa9YM6cJ1V1cg5S6mB7k71nT5kKOOJZocGX3OFeePzR96N+VFrNlOeoSusUyd2ZJeUBkiYqyounj9h68hBMUddGRkR9b049Xo1HH31IavmAoJQjWaQpo11iubvDg53tOPUSJlWs5c67ECI/e/j4JBEm4BKBYJpSYdO8n+6ku4sijBCOMK5TaA7UogJk5nMivNMWik/VkSFDDPAfifuWjE6hLEselENwKynqs3yiVIRKJk+C1jOTp99CeBLZLw9Lh0ZSPUvCvESfTRqtoi0SbqoNEfBAazZRJt5yAWKIZwpR/6UWGYZqI5YmZKlg2nLIqWWKv8AHiAqlVi5eu8q1u3dbwnySXsGzh59z9PwF0iXu/NR7TZgVZBsC9fiYZ59/jteRi1dvcPXOHbAg51yiuubF4/sc7z4npwW379wh5zS/B4RSC9vPNht6Oith1klO+PLV61zYuMhoFQhxbsqZF1vPON4/QLvMrdu36FOPYQ3HC+Nqxd6LF5QqXLhyiet3755U1FuUZ+09fcrR9jZ0PXd++h55bRGVNISVGMeBZ589IHllMq6nFiA4DTPj4o2bXLv3DuNYI7GOk1KmjIWDJ89Yv7DBzXtv4zkjNSavqkAZefHkMcOw5PLN21x/+x7jOEQpqytdv8ZydcD+1lP6xUUuX7+OiM7aShNwM3ZebDWbfXZNxCjVWL90mYvXrkaBHYA4fdexXB5zsLfDYrHBtZs3G+qZVG1CLZWDvT3s+IjLb9zgjXfusRqGuf9dn8ELe1ubrF+4yI137kFOQUl78GFSC88/fwLFSNa9ugBhQkwDIpZSGMcRQ6kUPPdhw3MkIOpYqeZ4DTvpSfBaTzEXhXFcUVYjNTtiYXashu7SPL5jYk/NQspxCsiSzrJChkBBtVRqu+tBmqptHIeZ/xf3VnjhTdXW7ruwqW+hGC9jYRiHBp8tCvIarS7ulGEMLsim+mRFLExPMMW5wqvCrClsnnsdCZJGd+BaIdkcWExDm9KW8xU2zc2EkyKSGI1LF/VZeKsNH7sYrhYFfnqmZQHRbtFy3Y5o6DhPh3jSonFaLCJtLKraRLvhz8QBazkLTmoM0BSbM5gtCjFGlQn/vXz1j4jgZglOnwBpUWFt0ZwoKSVUIDX8HB2Io6ua8BR5pKiEUUhRjuYWr2uXEa8kjd2VcmSCpDlCDS/dKm9o+pzWSWcuifpJ2+bmPMSYSG1XJjT4q9oycDiWNFRu+EuT5pOalghiNGkUp0yF7Amiwp8AJykIv2mlVUNdqH5S7P3yAgB4MtHM0f4ey909qtcILrxiqhzv7iGujKuBw91tch91USEzVHw14mNFNLPc3+f4YJ8yDu16AqiaWR0eoTlhXjleHpFyBnOqh8mxoeAlIF/AlZ+83QKepA53GJcDxwfHVJsydEKfMsPyGNGEl8rx4SHSNaTT8rdlLJHbSMrh/h7LvV2seitJcqoIy4N9kgg2DBzv7CJrXUheWtA3LAtWwq/yKgr61//6b+e//r/8mze6rmdv66nsP9tkKsCYTIxXIfUL3CqffOe7JKmIpbkTyRxTIy2EF48f8fzRk1mWOOdVtZC6KGZ+8sln0AI5F59l8IIjKZ+ZOnoagmpi7/kLdp/vBH/lhrQ7cSqhALdSefTpfUwgeYvvm4LexNGc2N96xsHz5/DStQoVk0ruO6oVPvt/fy82noZoTRo/FFFbmqX3L+eEfVwXeiY4GInT6Woup9PAsQpIrYwU1EuDq9oupIhCbkGoXmITu88XeZAlMDgwjpHsmIShVYI3z5qCugjtjBwcHPxErNzD8Yq4PUeB0vgpGiE4XSM2XURlbg0cMPsqrw4eCg9p9WO1OtoyYtP9GaQ4ybhQzZBJcEBtlwFIAxYyO7p5Af7e3/3nw0//qT/3ZBjrvbxY+OVrb2CUFrlFYuV4f49xXAHKpWtXW5FyAY18sQ0j+we7mEO/6Ll44QKTY5uM+8HRAWVcoipcu3sT6bp5wRBnWC5jd4kTCi/8K1/5in3729/+sRfAbFGqmVeH9YtX2LhyKS4OJJLjKsLeiy3KcomJ8sbdN0ldF0kiadHuamDvxQvMndx1XLhwcU7GT8Ha4eEepUHTyzdv0vd9EyqEYy/FOHyx3dzCF1xVIKiXOvDGtdvcfvNNioUKzHG6lHn64AFP7n/G+sYGd9750iwxnDy9jYWjHxyxGpbcun2dG3dus6oloJaFeGnz8RM2Hz1g48IG737961hehGNvrKutVvzg3/+7UBynNHzjG+T93/3dRIvKwlWe7vPL/z79++bPWdRPryTt83IYeeutN7lx723GYUQ14p6+zzz8wY94+OGHXLhyiXe+1hIyTlsA8LLie7/1W5SDA27cvMHtu19iKCOTTEU18XzzCU8e3Ke/uM69n/uZKNeyBmddoFZ+9Du/S7VxrsB9pVA7rLk4WCmYVaqWOF61MkG1YDebeSI0HuaKWW0ON45kqQUvZYaVbpHuVBPUM0M1Sj1uFxsx6b9IXad1NXLx4uX/+WD1P/z159dq/vp/e6+oaMsRBGUuxH0/0h4etDhBJQj8kiK/CL4j6WpaG2/4uKK6yTCuKKWGms9CgREcr2HqFBuhTMLIsEVWhslbgQjFrNHSUfMQduJUjVgtQU+bNw0pwfJK+54vvK5GpM5HTmM0QaM2Qk7B2izJPKlNPd1CgOBHpiII5g47Pt+/0xY7pNrt8opGZeEUzExrdUZb/Iolw6VVo3gl1eDTJ6pcUkI1ItXaqjUnVbdYvC6qkfqU3Iopohy3jZmUpuxvbJ24w0gbCAjuRxt8Ppksp7agS4ixmwqhrJ2KWE5qIhISm8UrKkJ91QSVf/rP0s/+/X94hXi/mEyyc5mDh+lyJWs7jUllJm3lm6NxD9qKU4syXZBqlNhxEqm7qMBpZaxtabypp/YODiwvQiZ+8crVgNzFqK0+1MfCuFpRxoL2HZcvXQ6KWKJ4XIHlakkZV5K0E/FT94W2UzIr2zRuU0mNpKtOE1G16FZiMNIWjQY4JC69w7XVusFcSePTJ9r3SCtmcfFZGHSCgm7+gYh7FhPMKi3TFl+kEiLasYYaehwopZC7Pp7dNPY2trSlpJYRa3ekeWMNxcAsbkUxoY4DXd9HFslCn1OthHpAwJKpu5FTx9tf/SplsqktoePjyGd/8D3KcsWtN+/w5k/9FMvlEEEi4Sy3Hz7k849/FLey4AzHyzgZ87UDUR1vpYR1KxUbR6TVBwih2qi1IBa3opRS4yYZq3H5FEKqoZxQJ+6RGAZ00c8L7ICVuLApkFCaDFzMYUrKz3z9V/7tcsmv1GS1X+TULkSY1bx1NLxWarIo7W93fXnLCYtpmAFvRW99h1i74E9bMfNYGTHcE7mLaLvCS7VVthrx5CzW18kpo5r50s//PLXPpHaxkgFqzoPvf4/jnV2uf+ktbn/lK6xK1P3ikLqevSdPePrxj+jzGgcHB5Q60q9vzNeoTQKtcTjGKUjNaJ/JLeMV0vp2UoYhon5Rck4h7EJaoaIjdaTgmEsEmCmuQKNZBzejjkNZaJeH5c5f/fTD7/5vrxZqKyl2x+p41YKUcHpVaih6MyRPMUlxt2dorpoN0qamrlapy2VwKh7yxuLBw6BxQ2FdRodF41IjNYk1bxRH4PMwedUreJrzyGHLQZvDn64rlDapJ7yDnNh6TZQ6RqXP5MPaH0lRRKECdRiwoYC0+wQaVE0iUbRhxrBqG2qmFbxd8hG+orQS1phU5vfoXJXzqhN2QAzTuBVXk842MGxkUAaIBEeeYaosjyh3ipttLsiQCbGIRoGERxUizUnRNY3wlDqapNQ06CaBdiYyL55WcBLuKQI30Zi86eoxryGTcUOkNNIsUZvGVadJmgnD5hcaVo+ypTRjez0lSih4aKzkhOMRtI137mD4jKYQnPIp8R2GmGHiX3xVgXsr4Gxh4KTqCp83ybIjcnWdkiiN3WxBi7+EwCf66oQdjJuY46VZttc08ycdma5UpYkCYZE7NGeqtRSgCHWsca0AwcF2qcNz7DB3pUsd0+XgLpPk19G5f9MitP7M8Xa7rNNP+t+A5Ok3TXM2dXl+lrz6nvbfyZE3dkNeWgDHGceSqMlU26UqEvdhtsOBN42hSKtqIbiUWJM0gd2T0so50Ui7PzN6M90IP92nbB4LPKEI8QnWqypqNo7y2fd/SMpBkFWPYj6rRh1GVJWdrU2WB4f4qakNAmwZqu5STT3S4/P2nRMuMF+b1pjDIOanG1VSe68BiZO7sH1ekGlMcnoveVxO5Y3y8KiXcHG3rDpOCxDTZm5illV7raCikVxuif/YA80pB/yUZt2mXRKdLRIqtzztllYvME3MbKORE01RgLOAox5BXtYkC8VFVA3n6OBgfoY2LOwNNqKJuqocLHfivn6Tky9DMVX6pMkc3CIuCFMW9cqxi7WZEw1QIQ4tblGLO4RcfI4H5psUJ0mCT0XoU+ImxqV2Gs5WzLUTV9Y31u+fOgHv43zAhcTfHmz8RwaXgNHxDU9SXMgigtQyHbkiKgkRibuC4thZdXptdlIj0JqOpOnkZsLWu0VyZopkRQWvjquYqKqN5f+WevjrCf7xYm3tTjEgLsdnuvlkmgKn7euWo3AsLuNCg6FXES/jf7go9S0W+c1aqyPB0xrx/0pQSYgb5uVlk2EOySruVUSSU9WnK7caCzr5i0CCbfKnWgGTuCAcQzQbltXGo3/zxrXNfzu966X267/+Nxc/+MHzjct1tL3Uad93vj5szO/bZZe+73w49TuAK+21V38Xn/nidoUrpz7T3r27y5UrV/gH3/rWtgPvv/+NvLb6c5d2d19/yi677Rkn3/VHtV/71re23f+v/Gu/9i8v7d7fPenX7i5cudL6f6q3p7rV993soIZhfHnOXun+a4O9cvLkabzf+tb/sf1H9fPshDhn0s70f+TzJ2ls8toPX/Tif+F2YkjP7nl/0sZ23s7beTtv5+28nbfzdt7O23k7b+ftvJ2383beztt5O2//lbT/CBDjOfBaG+n6AAAAAElFTkSuQmCC" style="width:36px;height:36px;object-fit:contain;object-position:center;" />',
  'Financials':             '💰',
  'HoA Rules & Regulations':'📜',
  'Newsletters':            '📰',
  'Vendors':                '🔧'
};
const LIB_FILE_ICONS = {
  'pdf':'📕','doc':'📘','docx':'📘','xls':'📗','xlsx':'📗',
  'csv':'📗','ppt':'📙','pptx':'📙','txt':'📄','png':'🖼','jpg':'🖼','jpeg':'🖼'
};

function libFileExtIcon(filename) {
  var ext = (filename || '').split('.').pop().toLowerCase();
  return LIB_FILE_ICONS[ext] || '📄';
}
function libFormatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/(1024*1024)).toFixed(1) + ' MB';
}

var libDocsCache   = [];
var _libFileData   = null;
var libSourceMode  = 'upload';
var libAdminDocs   = [];
var libAdminEditId = null;

// ---- Source tab toggle ----
function libToggleSourceTab(mode) {
  libSourceMode = mode;
  var tabUp  = document.getElementById('lib-tab-upload');
  var tabUrl = document.getElementById('lib-tab-url');
  var panUp  = document.getElementById('lib-source-upload');
  var panUrl = document.getElementById('lib-source-url');
  if (!tabUp) return;
  if (mode === 'upload') {
    tabUp.style.background='#2a3a55'; tabUp.style.color='white';
    tabUrl.style.background='white';  tabUrl.style.color='#bbb';
    panUp.style.display='block'; panUrl.style.display='none';
    setTimeout(libInitDropZone, 50);
  } else {
    tabUrl.style.background='#2a3a55'; tabUrl.style.color='white';
    tabUp.style.background='white';   tabUp.style.color='#bbb';
    panUrl.style.display='block'; panUp.style.display='none';
  }
}

// ---- File picker + drag-and-drop ----
function libInitDropZone() {
  var zone = document.getElementById('lib-file-zone');
  if (!zone || zone._libDropReady) return;
  zone._libDropReady = true;
  zone.addEventListener('dragover', function(e) { e.preventDefault(); zone.classList.add('lib-file-zone-hover'); });
  zone.addEventListener('dragleave', function() { zone.classList.remove('lib-file-zone-hover'); });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('lib-file-zone-hover');
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) libHandleFile(file);
  });
}

function libFileSelected(input) {
  var file = input.files[0];
  if (file) libHandleFile(file);
}

function libHandleFile(file) {
  if (file.size > 10*1024*1024) { libShowFormMsg('File must be under 10 MB.','error'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var b64 = e.target.result.split(',')[1];
    _libFileData = { name: file.name, mimeType: file.type||'application/octet-stream', base64: b64, size: file.size };
    var preview = document.getElementById('lib-file-preview');
    document.getElementById('lib-file-icon').textContent = libFileExtIcon(file.name);
    document.getElementById('lib-file-name').textContent = file.name;
    document.getElementById('lib-file-size').textContent = libFormatBytes(file.size);
    if (preview) { preview.style.display='flex'; }
    var zone = document.getElementById('lib-file-zone');
    if (zone) zone.style.borderColor='#2a3a55';
    var titleEl = document.getElementById('lib-admin-title');
    if (titleEl && !titleEl.value.trim()) titleEl.value = file.name.replace(/\.[^/.]+$/,'');
  };
  reader.readAsDataURL(file);
}
function libClearFile() {
  _libFileData = null;
  var input = document.getElementById('lib-file-input');
  if (input) input.value = '';
  var preview = document.getElementById('lib-file-preview');
  if (preview) preview.style.display = 'none';
  var zone = document.getElementById('lib-file-zone');
  if (zone) zone.style.borderColor = '';
  libSetProgress(-1,'');
}
function libSetProgress(pct, statusText) {
  var wrap = document.getElementById('lib-upload-progress');
  if (!wrap) return;
  wrap.style.display = pct >= 0 ? 'block' : 'none';
  var bar = document.getElementById('lib-upload-bar');
  var st  = document.getElementById('lib-upload-status');
  if (bar) bar.style.width = pct + '%';
  if (st)  st.textContent = statusText || '';
}
function libShowFormMsg(msg, type) {
  var el = document.getElementById('lib-admin-form-msg');
  if (!el) return;
  el.textContent = msg;
  el.style.cssText = type === 'error'
    ? 'display:block;color:#c0392b;background:#fff3f3;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:13px;'
    : 'display:block;color:#2e7d32;background:#e8f5e9;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:13px;';
}
function libHideFormMsg() {
  var el = document.getElementById('lib-admin-form-msg');
  if (el) el.style.display = 'none';
}

// ---- Resident view ----
function openLibrary() { toggleView('library'); window.scrollTo({top:0,behavior:'instant'}); libResidentLoad(); }

var LIB_CACHE_KEY = 'pke_lib_cache';
var LIB_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function libResidentLoad() {
  var container = document.getElementById('library-sections-container');
  if (!container) return;

  // Try sessionStorage cache first for instant render
  try {
    var cached = sessionStorage.getItem(LIB_CACHE_KEY);
    if (cached) {
      var parsed = JSON.parse(cached);
      if (parsed && parsed.ts && (Date.now() - parsed.ts < LIB_CACHE_TTL) && parsed.docs) {
        libDocsCache = parsed.docs;
        libResidentRender(container);
        return;
      }
    }
  } catch(e) {}

  // Show skeleton while fetching
  container.innerHTML = libSkeletonHtml();
  fetch(WEB_APP_URL, {method:'POST', body:JSON.stringify({action:'getLibraryDocs'})})
    .then(function(r){return r.json();})
    .then(function(data){
      if (!data.success){container.innerHTML='<div style="padding:20px;color:#c0392b;">Failed to load library.</div>';return;}
      libDocsCache = data.docs || [];
      try { sessionStorage.setItem(LIB_CACHE_KEY, JSON.stringify({ts:Date.now(), docs:libDocsCache})); } catch(e){}
      libResidentRender(container);
    })
    .catch(function(){container.innerHTML='<div style="padding:20px;color:#c0392b;">Connection error.</div>';});
}

function libSkeletonHtml() {
  var isMobile = window.innerWidth <= 600;
  if (isMobile) {
    var h = '';
    for (var i=0;i<6;i++) {
      h += '<div style="background:white;border:1px solid #dde3ea;border-radius:10px;margin-bottom:10px;overflow:hidden;">';
      h += '<div style="padding:14px 16px;display:flex;align-items:center;gap:12px;">';
      h += '<div style="width:28px;height:28px;background:#eee;border-radius:6px;flex-shrink:0;animation:libPulse 1.2s ease-in-out infinite;"></div>';
      h += '<div style="flex:1;height:15px;background:#eee;border-radius:4px;animation:libPulse 1.2s ease-in-out infinite;"></div>';
      h += '</div></div>';
    }
    return '<style>@keyframes libPulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>'+h;
  } else {
    var h = '<style>@keyframes libPulse{0%,100%{opacity:1}50%{opacity:0.4}}</style>';
    h += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;padding:4px 0 8px;">';
    for (var i=0;i<6;i++) {
      h += '<div style="background:white;border:1px solid #dde3ea;border-radius:12px;padding:22px 16px 18px;display:flex;flex-direction:column;align-items:center;gap:8px;">';
      h += '<div style="width:36px;height:36px;background:#eee;border-radius:8px;animation:libPulse 1.2s ease-in-out infinite;"></div>';
      h += '<div style="width:80%;height:13px;background:#eee;border-radius:4px;animation:libPulse 1.2s ease-in-out infinite;"></div>';
      h += '<div style="width:60%;height:11px;background:#eee;border-radius:4px;animation:libPulse 1.2s ease-in-out infinite;"></div>';
      h += '</div>';
    }
    return h + '</div>';
  }
}

function libIsMobile() { return window.innerWidth <= 600; }

function libResidentRender(container) {
  var docs = libDocsCache;
  var sortedSections = LIBRARY_SECTIONS.slice().sort(function(a,b){return a.localeCompare(b);});

  if (libIsMobile()) {
    // ---- MOBILE: flat collapsible accordion ----
    var html = '<div class="lib-accordion">';
    sortedSections.forEach(function(section, idx){
      var sd = docs.filter(function(d){return d.section===section;});
      var icon = LIBRARY_SECTION_ICONS[section]||'📄';
      var count = sd.length;
      var sectionId = 'lib-acc-' + idx;
      var safeSection = escapeHtml(section);
      html += '<div class="lib-acc-item">';
      // Header row — collapsed by default (aria-expanded=false)
      html += '<button class="lib-acc-header" aria-expanded="false" aria-controls="'+sectionId+'" onclick="libAccToggle(this,\''+sectionId+'\')">';
      html += '<span class="lib-acc-icon">'+icon+'</span>';
      html += '<span class="lib-acc-label">'+safeSection+'</span>';
      html += '<span class="lib-acc-count">'+(count===0?'—':count+(count===1?' doc':' docs'))+'</span>';
      html += '<span class="lib-acc-chevron">▾</span>';
      html += '</button>';
      // Body — hidden by default
      html += '<div class="lib-acc-body" id="'+sectionId+'" style="display:none;">';
      if (!sd.length) {
        html += '<p class="lib-acc-empty">No documents in this section yet.</p>';
      } else {
        sd.forEach(function(doc){
          var fi = doc.sourceType==='upload' ? libFileExtIcon(doc.fileName||doc.title) : '🔗';
          html += '<a class="lib-acc-doc" href="'+escapeHtml(doc.url)+'" target="_blank" rel="noopener">';
          html += '<span class="lib-acc-doc-icon">'+fi+'</span>';
          html += '<span class="lib-acc-doc-info">';
          html += '<span class="lib-acc-doc-title">'+escapeHtml(doc.title)+'</span>';
          if (doc.description) html += '<span class="lib-acc-doc-desc">'+escapeHtml(doc.description)+'</span>';
          html += '</span>';
          html += '<span class="lib-acc-doc-open">Open ↗</span>';
          html += '</a>';
        });
      }
      html += '</div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  } else {
    // ---- DESKTOP: original card grid ----
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;padding:4px 0 8px;">';
    sortedSections.forEach(function(section){
      var sd = docs.filter(function(d){return d.section===section;});
      var icon = LIBRARY_SECTION_ICONS[section]||'📄';
      var count = sd.length;
      var safeSection = escapeHtml(section).replace(/'/g,"&#39;");
      html += '<div onclick="libOpenSection(\''+safeSection+'\')" style="background:white;border:1px solid #dde3ea;border-radius:12px;padding:22px 16px 18px;cursor:pointer;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.07);transition:box-shadow 0.15s,transform 0.15s;display:flex;flex-direction:column;align-items:center;gap:8px;" onmouseover="this.style.boxShadow=\'0 6px 20px rgba(0,0,0,0.13)\';this.style.transform=\'translateY(-2px)\'" onmouseout="this.style.boxShadow=\'0 2px 8px rgba(0,0,0,0.07)\';this.style.transform=\'none\'">';
      html += '<div style="font-size:36px;line-height:1;display:flex;align-items:center;justify-content:center;">'+icon+'</div>';
      html += '<div style="font-weight:700;font-size:13px;color:#2a3a55;line-height:1.3;text-align:center;">'+escapeHtml(section)+'</div>';
      html += '<div style="font-size:11px;color:#999;margin-top:2px;">'+(count===0?'No documents':count===1?'1 document':count+' documents')+'</div>';
      html += '<div style="margin-top:6px;background:#2a3a55;color:white;border-radius:20px;padding:5px 16px;font-size:12px;font-weight:bold;">View ›</div>';
      html += '</div>';
    });
    html += '</div>';
    container.innerHTML = html;
  }
}

function libAccToggle(btn, bodyId) {
  var body = document.getElementById(bodyId);
  if (!body) return;
  var isOpen = btn.getAttribute('aria-expanded') === 'true';
  if (isOpen) {
    body.style.display = 'none';
    btn.setAttribute('aria-expanded', 'false');
    btn.querySelector('.lib-acc-chevron').style.transform = '';
  } else {
    body.style.display = 'block';
    btn.setAttribute('aria-expanded', 'true');
    btn.querySelector('.lib-acc-chevron').style.transform = 'rotate(180deg)';
  }
}

function libOpenSection(section) {
  var container = document.getElementById('library-sections-container');
  if (!container) return;
  var docs = libDocsCache;
  var sd = docs.filter(function(d){return d.section===section;});
  var icon = LIBRARY_SECTION_ICONS[section]||'📄';
  var html = '';
  // Back button
  html += '<div style="margin-bottom:16px;">';
  html += '<button onclick="libResidentRender(document.getElementById(\'library-sections-container\'))" style="background:none;border:none;color:#2a3a55;cursor:pointer;font-weight:bold;font-size:14px;padding:0;">← Back to Library</button>';
  html += '</div>';
  // Section header
  var headerIcon = icon.indexOf('<img') !== -1 ? icon.replace(/width:\s*36px/,'width:24px').replace(/height:\s*36px/,'height:24px') : icon;
  html += '<div style="background:#2a3a55;color:white;padding:14px 18px;font-weight:bold;font-size:16px;border-radius:10px 10px 0 0;display:flex;align-items:center;gap:10px;">'+headerIcon+'<span>'+escapeHtml(section)+'</span></div>';
  html += '<div style="background:white;border:1px solid #dde3ea;border-top:none;border-radius:0 0 10px 10px;box-shadow:0 2px 8px rgba(0,0,0,0.07);">';
  if (!sd.length) {
    html += '<div style="text-align:center;padding:48px;color:#aaa;font-style:italic;">No documents have been added to this section yet.</div>';
  } else {
    html += '<div style="padding:4px 16px 8px;">';
    sd.forEach(function(doc){
      var fi = doc.sourceType==='upload' ? libFileExtIcon(doc.fileName||doc.title) : '🔗';
      html += '<div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f2f4f7;">';
      html += '<span style="font-size:22px;line-height:1;flex-shrink:0;">'+fi+'</span>';
      html += '<div style="flex:1;min-width:0;">';
      html += '<a href="'+escapeHtml(doc.url)+'" target="_blank" rel="noopener" style="color:#2a3a55;font-weight:600;font-size:14px;text-decoration:none;">'+escapeHtml(doc.title)+'</a>';
      if (doc.description) html += '<div style="color:#777;font-size:12px;margin-top:3px;line-height:1.4;">'+escapeHtml(doc.description)+'</div>';
      html += '</div>';
      html += '<a href="'+escapeHtml(doc.url)+'" target="_blank" rel="noopener" style="background:#f0f6fb;border:1px solid #b3d1e8;color:#2a3a55;padding:5px 13px;border-radius:20px;font-size:12px;font-weight:bold;white-space:nowrap;text-decoration:none;flex-shrink:0;">Open ↗</a>';
      html += '</div>';
    });
    html += '</div>';
  }
  html += '</div>';
  container.innerHTML = html;
  container.scrollIntoView({behavior:'smooth',block:'start'});
}

// ---- Admin view ----
function libAdminLoad() {
  var tbody = document.getElementById('lib-admin-tbody');
  if (tbody) tbody.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#888;">Loading…</td></tr>';
  fetch(WEB_APP_URL, {method:'POST', body:JSON.stringify({action:'getLibraryDocs'})})
    .then(function(r){return r.json();})
    .then(function(data){libAdminDocs=data.docs||[];libAdminRender();})
    .catch(function(){
      var tbody=document.getElementById('lib-admin-tbody');
      if(tbody)tbody.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#c0392b;">Connection error.</td></tr>';
    });
}

function libAdminRender() {
  var search    = (document.getElementById('lib-admin-search')||{}).value||'';
  var filterSec = (document.getElementById('lib-admin-filter-section')||{}).value||'';
  var rows = libAdminDocs.slice();
  if (filterSec) rows=rows.filter(function(d){return d.section===filterSec;});
  if (search){var q=search.toLowerCase();rows=rows.filter(function(d){return(d.title||'').toLowerCase().includes(q)||(d.section||'').toLowerCase().includes(q)||(d.description||'').toLowerCase().includes(q);});}
  var tbody=document.getElementById('lib-admin-tbody');
  if(!tbody) return;
  if(!rows.length){tbody.innerHTML='<tr><td colspan="7" style="padding:24px;text-align:center;color:#888;">No documents found.</td></tr>';return;}
  tbody.innerHTML=rows.map(function(d){
    var badge = d.sourceType==='upload'
      ? '<span style="background:#e8f5e9;color:#2e7d32;border-radius:12px;padding:2px 9px;font-size:11px;font-weight:bold;white-space:nowrap;">⬆ Uploaded</span>'
      : '<span style="background:#e3f2fd;color:#1565c0;border-radius:12px;padding:2px 9px;font-size:11px;font-weight:bold;white-space:nowrap;">🔗 Link</span>';
    return '<tr style="border-bottom:1px solid #eef0f3;">'
      +'<td style="padding:10px 16px;font-size:13px;color:#555;white-space:nowrap;">'+escapeHtml(d.section||'')+'</td>'
      +'<td style="padding:10px 16px;font-size:13px;font-weight:600;color:#2a3a55;">'+escapeHtml(d.title||'')+'</td>'
      +'<td style="padding:10px 16px;font-size:12px;color:#888;">'+escapeHtml(d.description||'—')+'</td>'
      +'<td style="padding:10px 16px;text-align:center;">'+badge+'</td>'
      +'<td style="padding:10px 16px;font-size:12px;"><a href="'+escapeHtml(d.url||'')+'" target="_blank" rel="noopener" style="color:#2a3a55;font-weight:bold;">Open ↗</a></td>'
      +'<td style="padding:10px 16px;font-size:12px;color:#aaa;white-space:nowrap;">'+escapeHtml(d.addedDate||'')+'</td>'
      +'<td style="padding:10px 16px;white-space:nowrap;">'
      +'<button onclick="libAdminOpenEdit(\'' + escapeHtml(d.id||'') + '\');" style="background:#f0f6fb;border:1px solid #b3d1e8;color:#2a3a55;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;margin-right:4px;">✏️ Edit</button>'
      +'<button onclick="libAdminDelete(\'' + escapeHtml(d.id||'') + '\');" style="background:#fff3f3;border:1px solid #f5c6cb;color:#c0392b;padding:4px 10px;border-radius:6px;cursor:pointer;font-size:12px;">🗑 Delete</button>'
      +'</td></tr>';
  }).join('');
}

function libAdminOpenForm() {
  libAdminEditId=null;
  document.getElementById('lib-admin-form-title').textContent='Add Document';
  document.getElementById('lib-admin-section').value='';
  document.getElementById('lib-admin-title').value='';
  document.getElementById('lib-admin-url').value='';
  document.getElementById('lib-admin-desc').value='';
  libClearFile(); libHideFormMsg();
  document.getElementById('lib-admin-save-btn').textContent='Save Document';
  document.getElementById('lib-admin-save-btn').disabled=false;
  libToggleSourceTab('upload');
  document.getElementById('lib-admin-form-wrap').style.display='block';
  document.getElementById('lib-admin-form-wrap').scrollIntoView({behavior:'smooth',block:'start'});
}

function libAdminOpenEdit(id) {
  var doc=libAdminDocs.find(function(d){return d.id===id;});
  if(!doc) return;
  libAdminEditId=id;
  document.getElementById('lib-admin-form-title').textContent='Edit Document';
  document.getElementById('lib-admin-section').value=doc.section||'';
  document.getElementById('lib-admin-title').value=doc.title||'';
  document.getElementById('lib-admin-desc').value=doc.description||'';
  libClearFile(); libHideFormMsg();
  document.getElementById('lib-admin-save-btn').textContent='Save Document';
  document.getElementById('lib-admin-save-btn').disabled=false;
  libToggleSourceTab('url');
  document.getElementById('lib-admin-url').value=doc.url||'';
  document.getElementById('lib-admin-form-wrap').style.display='block';
  document.getElementById('lib-admin-form-wrap').scrollIntoView({behavior:'smooth',block:'start'});
}

function libAdminCancelForm() {
  document.getElementById('lib-admin-form-wrap').style.display='none';
  libClearFile(); libAdminEditId=null;
}

function libAdminSave() {
  var section=document.getElementById('lib-admin-section').value.trim();
  var title  =document.getElementById('lib-admin-title').value.trim();
  var desc   =document.getElementById('lib-admin-desc').value.trim();
  if (!section){libShowFormMsg('Please select a section.','error');return;}
  if (!title)  {libShowFormMsg('Please enter a title.','error');return;}
  var btn=document.getElementById('lib-admin-save-btn');
  btn.disabled=true; btn.textContent='Saving…';
  libHideFormMsg();

  // --- UPLOAD MODE (new docs only) ---
  if (libSourceMode==='upload' && !libAdminEditId) {
    if (!_libFileData){libShowFormMsg('Please select a file, or switch to URL / Link.','error');btn.disabled=false;btn.textContent='Save Document';return;}
    libSetProgress(10,'Uploading to Google Drive…');
    fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({
      action:'uploadLibraryFile', section:section, title:title, description:desc,
      fileName:_libFileData.name, mimeType:_libFileData.mimeType, fileBase64:_libFileData.base64
    })})
    .then(function(r){libSetProgress(80,'Processing…');return r.json();})
    .then(function(data){
      libSetProgress(-1,'');
      btn.disabled=false; btn.textContent='Save Document';
      if(data.success){try{sessionStorage.removeItem(LIB_CACHE_KEY);}catch(e){}libAdminCancelForm();libAdminLoad();}
      else{libShowFormMsg(data.error||'Upload failed. Please try again.','error');}
    })
    .catch(function(){libSetProgress(-1,'');btn.disabled=false;btn.textContent='Save Document';libShowFormMsg('Connection error.','error');});
    return;
  }

  // --- URL MODE (or editing any doc) ---
  var url=document.getElementById('lib-admin-url').value.trim();
  if (!url){libShowFormMsg('Please enter a URL, or switch to Upload File.','error');btn.disabled=false;btn.textContent='Save Document';return;}
  var payload={action:libAdminEditId?'editLibraryDoc':'addLibraryDoc',section:section,title:title,url:url,description:desc,sourceType:'url'};
  if (libAdminEditId) payload.id=libAdminEditId;
  fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify(payload)})
    .then(function(r){return r.json();})
    .then(function(data){
      btn.disabled=false; btn.textContent='Save Document';
      if(data.success){try{sessionStorage.removeItem(LIB_CACHE_KEY);}catch(e){}libAdminCancelForm();libAdminLoad();}
      else{libShowFormMsg(data.error||'Error saving.','error');}
    })
    .catch(function(){btn.disabled=false;btn.textContent='Save Document';libShowFormMsg('Connection error.','error');});
}

function libAdminDelete(id) {
  if(!confirm('Delete this document from the library? This cannot be undone.')) return;
  fetch(WEB_APP_URL,{method:'POST',body:JSON.stringify({action:'deleteLibraryDoc',id:id})})
    .then(function(r){return r.json();})
    .then(function(data){if(data.success){try{sessionStorage.removeItem(LIB_CACHE_KEY);}catch(e){}libAdminLoad();}else alert('Error: '+(data.error||'Unknown'));})
    .catch(function(){alert('Connection error. Please try again.');});
}
// ============================================================
