/**
 * Active Job Tracker — persists in-flight KIE generation jobs to localStorage
 * so they survive page refreshes. Each tool registers its own namespace.
 *
 * Usage:
 *   var tracker = window.ActiveJobTracker.create('video');
 *   tracker.save({ taskId, model, label, payload }); // on submit
 *   tracker.clear();                                  // on completion/failure
 *   tracker.load();                                   // on page load → returns saved or null
 *
 * Stale jobs older than 30 minutes are auto-discarded.
 */
(function(){
  if (window.ActiveJobTracker) return;
  var STALE_MS = 30 * 60 * 1000;

  function ns(name){ return 'ff_active_job_' + String(name||'default'); }

  function create(name){
    var key = ns(name);
    return {
      key: key,
      save: function(data){
        try {
          var payload = Object.assign({ ts: Date.now() }, data || {});
          localStorage.setItem(key, JSON.stringify(payload));
        } catch(_){}
      },
      load: function(){
        try {
          var raw = localStorage.getItem(key);
          if (!raw) return null;
          var data = JSON.parse(raw);
          if (!data || !data.ts) { localStorage.removeItem(key); return null; }
          if (Date.now() - data.ts > STALE_MS) { localStorage.removeItem(key); return null; }
          return data;
        } catch(_){ return null; }
      },
      clear: function(){
        try { localStorage.removeItem(key); } catch(_){}
      },
    };
  }

  window.ActiveJobTracker = { create: create };
})();
