const StudentHistory = {
  name: 'StudentHistory',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Student</div>
        <router-link to="/student" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/student/history" class="sidebar-link" active-class="active"><i class="bi bi-trophy"></i> Placement History</router-link>
        <router-link to="/student/profile" class="sidebar-link" active-class="active"><i class="bi bi-person-gear"></i> Profile</router-link>
      </aside>
      <main class="ppa-main">
        <div class="page-header">
          <h1 class="page-title">Placement History</h1>
          <div class="page-sub">Drives where you were selected</div>
        </div>
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else>
          <div v-if="!history.length" class="empty-state mt-5">
            <i class="bi bi-trophy"></i>
            <p>No selections yet. Keep applying!</p>
          </div>
          <div v-else class="row g-3">
            <div class="col-md-6" v-for="a in history" :key="a.id">
              <div class="ppa-card">
                <div class="d-flex align-items-center gap-3 mb-2">
                  <div style="width:42px;height:42px;background:rgba(0,212,170,.12);border-radius:10px;display:flex;align-items:center;justify-content:center;color:var(--accent);font-size:1.2rem;">
                    <i class="bi bi-trophy-fill"></i>
                  </div>
                  <div>
                    <div style="font-family:'Syne',sans-serif;font-weight:700;">{{ a.job_title }}</div>
                    <div style="color:var(--text-muted);font-size:.83rem;">{{ a.company_name }}</div>
                  </div>
                  <span class="badge-ppa badge-selected ms-auto">Selected</span>
                </div>
                <div style="font-size:.82rem;color:var(--text-muted);">
                  <i class="bi bi-calendar3 me-1"></i>Applied: {{ a.applied_on?.slice(0,10) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  setup() {
    const history = Vue.ref([]);
    const loading = Vue.ref(true);

    async function load() {
      loading.value = true;
      try { history.value = await api.get('/student/history'); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    load();
    return { history, loading };
  },
};
