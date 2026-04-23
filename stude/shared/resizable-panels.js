(function(){
  function injectStyles(){
    if(document.getElementById('splitter-style')) return;
    var st=document.createElement('style');
    st.id='splitter-style';
    st.textContent=`
      .vr { position: relative; width: 6px !important; background: #2d2d2d !important; cursor: col-resize !important; }
      .vr:hover, .vr.dragging { background: #4a9eff !important; }
      .vr::before { content:''; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:14px; height:2px; background:#9aa4b2; box-shadow:0 -4px 0 #9aa4b2,0 4px 0 #9aa4b2; opacity:.9; }
      .top-row { min-width: 0; }
      .top-row > .panel { min-width: 160px; }
    `;
    document.head.appendChild(st);
  }

  function setupSplitter(splitter){
    if(splitter.dataset.bound === '1') return;
    splitter.dataset.bound = '1';

    var prev = splitter.previousElementSibling;
    var next = splitter.nextElementSibling;
    if(!prev || !next) return;

    function onDown(e){
      e.preventDefault();
      splitter.classList.add('dragging');

      var startX = e.clientX;
      var prevRect = prev.getBoundingClientRect();
      var nextRect = next.getBoundingClientRect();
      var prevStart = prevRect.width;
      var nextStart = nextRect.width;

      prev.style.flex = 'none';
      next.style.flex = 'none';
      prev.style.width = prevStart + 'px';
      next.style.width = nextStart + 'px';

      var minPrev = 180;
      var minNext = 180;
      var maxPrev = prevStart + nextStart - minNext;
      var maxNext = prevStart + nextStart - minPrev;

      function onMove(ev){
        var dx = ev.clientX - startX;
        var newPrev = Math.max(minPrev, Math.min(maxPrev, prevStart + dx));
        var newNext = Math.max(minNext, Math.min(maxNext, nextStart - dx));
        prev.style.width = newPrev + 'px';
        next.style.width = newNext + 'px';
      }

      function onUp(){
        splitter.classList.remove('dragging');
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }

    splitter.addEventListener('mousedown', onDown);
  }

  function init(){
    injectStyles();
    document.querySelectorAll('.top-row .vr').forEach(setupSplitter);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  var mo = new MutationObserver(init);
  mo.observe(document.documentElement,{childList:true,subtree:true});
})();
