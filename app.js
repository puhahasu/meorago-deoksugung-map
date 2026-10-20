'use strict';
(() => {
  const byId = id => document.getElementById(id);
  const mapPage = byId('mapPage'), readingPage = byId('readingPage');
  const mapWindow = byId('mapWindow'), mapBoard = byId('mapBoard');
  const stateKey = 'meorago-map-state-v1';
  let rendered = false;
  let current = null, mapY = 0, zoom = 1, mapLeft = 0, mapTop = 0;
  let readingStates = {}, readKeys = new Set();
  function restoreState() {
    try {
      const s = JSON.parse(sessionStorage.getItem(stateKey) || '{}');
      mapY = Number(s.mapY) || 0;
      zoom = [1,1.5,2].includes(s.zoom) ? s.zoom : 1;
      mapLeft = Number(s.mapLeft) || 0; mapTop = Number(s.mapTop) || 0;
      readingStates = s.readingStates && typeof s.readingStates === 'object' ? s.readingStates : {};
      readKeys = new Set(Array.isArray(s.readKeys) ? s.readKeys : []);
    } catch (_) { /* Private browsing or disabled storage must not block reading. */ }
  }
  function remember() {
    if(current) readingStates[current] = {y:window.scrollY,expanded:byId('fullStory').open};
    else {mapY=window.scrollY;mapLeft=mapWindow.scrollLeft;mapTop=mapWindow.scrollTop;}
    try { sessionStorage.setItem(stateKey,JSON.stringify({mapY,zoom,mapLeft,mapTop,readingStates,readKeys:[...readKeys]})); } catch (_) {}
  }
  function paragraph(text) { const p=document.createElement('p');p.textContent=text;return p; }
  function renderMap() {
    const pins = byId('mapPins'), list=byId('placeList'), svg=byId('mapLeaders');
    for(const place of PLACES) {
      const a=document.createElement('a');a.href='#'+place.key;
      a.className='map-pin';
      a.style.left=place.label[0]+'%';a.style.top=place.label[1]+'%';
      a.textContent=place.mapName;a.dataset.key=place.key;
      a.setAttribute('aria-label',place.name+' · 쉬운 설명');
      pins.append(a);
      const ns='http://www.w3.org/2000/svg';
      const line=document.createElementNS(ns,'line');
      for(const [attr,value] of Object.entries({x1:place.anchor[0],y1:place.anchor[1],x2:place.label[0],y2:place.label[1],class:'map-leader'}))line.setAttribute(attr,value);
      svg.append(line);
      const point=document.createElementNS(ns,'circle');point.setAttribute('cx',place.anchor[0]);point.setAttribute('cy',place.anchor[1]);point.setAttribute('r','.7');point.setAttribute('class','anchor');svg.append(point);
      const li=document.createElement('li'), link=document.createElement('a');link.href='#'+place.key;
      const name=document.createElement('span');name.textContent=place.name;
      link.append(name);li.append(link);list.append(li);
    }
  }
  function updateReadMarks() { document.querySelectorAll('.map-pin').forEach(a=>a.classList.toggle('was-read',readKeys.has(a.dataset.key))); }
  function renderReading(place) {
    byId('placeHeading').textContent=place.name;
    byId('summary').textContent=place.summary;
    byId('storyBody').replaceChildren(...place.paragraphs.map(paragraph));
    byId('fullStory').open=!!readingStates[place.key]?.expanded;
    byId('storyToggleLabel').textContent=byId('fullStory').open?'접기':'더 자세히 읽기';
    const footnotes=byId('footnotes');footnotes.replaceChildren();
    for(const note of place.footnotes||[]) {
      const detail=document.createElement('details');detail.className='footnote';
      const summary=document.createElement('summary');summary.textContent=note.title;
      const chevron=document.createElement('span');chevron.setAttribute('aria-hidden','true');chevron.textContent='⌄';summary.append(chevron);
      detail.append(summary,paragraph(note.body));footnotes.append(detail);
    }

  }
  function route() {
    const key=location.hash.slice(1)||'map';
    const place=PLACES.find(p=>p.key===key);
    const notice=byId('routeNotice');notice.hidden=true;
    if (rendered) remember();
    if(place) {
      current=place.key;renderReading(place);
      mapPage.hidden=true;readingPage.hidden=false;
      readKeys.add(place.key);updateReadMarks();
      document.title=place.name+' · 머라고';
      byId('placeHeading').focus({preventScroll:true});
      requestAnimationFrame(()=>window.scrollTo(0,Number(readingStates[place.key]?.y)||0));
    } else {
      current=null;mapPage.hidden=false;readingPage.hidden=true;
      document.title='머라고 · 덕수궁 맵';
      if(key!=='map'){notice.textContent='해당 설명을 찾지 못했습니다. 맵에서 장소를 다시 선택해주세요.';notice.hidden=false;}
      applyZoom();
      requestAnimationFrame(()=>{mapWindow.scrollLeft=mapLeft;mapWindow.scrollTop=mapTop;window.scrollTo(0,mapY);});
    }
    rendered=true;
  }
  function applyZoom(){mapBoard.style.width=(zoom*100)+'%';byId('zoomLabel').textContent=Math.round(zoom*100)+'%';byId('zoomOut').disabled=zoom===1;byId('zoomIn').disabled=zoom===2;byId('mapHint').hidden=zoom===1;}
  function changeZoom(direction){const levels=[1,1.5,2],next=levels[levels.indexOf(zoom)+direction];if(!next)return;const x=(mapWindow.scrollLeft+mapWindow.clientWidth/2)/mapBoard.clientWidth;const y=(mapWindow.scrollTop+mapWindow.clientHeight/2)/mapBoard.clientHeight;zoom=next;applyZoom();mapWindow.scrollLeft=x*mapBoard.clientWidth-mapWindow.clientWidth/2;mapWindow.scrollTop=y*mapBoard.clientHeight-mapWindow.clientHeight/2;remember();}
  byId('zoomIn').addEventListener('click',()=>changeZoom(1));byId('zoomOut').addEventListener('click',()=>changeZoom(-1));
  window.addEventListener('hashchange',route);
  window.addEventListener('pagehide',remember);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')remember();});
  byId('fullStory').addEventListener('toggle',()=>{byId('storyToggleLabel').textContent=byId('fullStory').open?'접기':'더 자세히 읽기';if(current)remember();});
  if('scrollRestoration' in history) history.scrollRestoration='manual';
  restoreState();renderMap();updateReadMarks();applyZoom();
  // Do not overwrite a saved map position on initial navigation.
  const initialMapY=mapY, initialLeft=mapLeft, initialTop=mapTop;
  route();
  if(!current){mapY=initialMapY;mapLeft=initialLeft;mapTop=initialTop;requestAnimationFrame(()=>{window.scrollTo(0,mapY);mapWindow.scrollLeft=mapLeft;mapWindow.scrollTop=mapTop;});}
})();
