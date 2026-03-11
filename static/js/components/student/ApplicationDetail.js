const ApplicationDetail = {
  name: 'ApplicationDetail',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Student</div>
        <router-link to="/student" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/student/history" class="sidebar-link" active-class="active"><i class="bi bi-trophy"></i> Placement History</router-link>
        <router-link to="/student/profile" class="sidebar-link" active-class="active"><i class="bi bi-person-gear"></i> Profile</router-link>
      </aside>
      <main class="ppa-main">
        <router-link to="/student" style="color:var(--text-muted);text-decoration:none;font-size:.9rem;" class="d-inline-flex align-items-center gap-1 mb-4">
          <i class="bi bi-arrow-left"></i> Back to Dashboard
        </router-link>
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else-if="app" style="max-width:600px;">
          <div class="ppa-card">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <div>
                <div style="color:var(--text-muted);font-size:.85rem;"><i class="bi bi-building me-1"></i>{{ app.company_name }}</div>
                <h2 style="font-family:'Syne',sans-serif;font-size:1.4rem;margin:.2rem 0 0;">{{ app.job_title }}</h2>
              </div>
              <span class="badge-ppa" :class="'badge-'+app.status" style="font-size:.85rem;">{{ app.status }}</span>
            </div>

            <div class="mb-4" style="padding:.75rem 1rem;background:var(--bg-elevated);border-radius:10px;font-size:.88rem;color:var(--text-muted);">
              {{ app.job_description }}
            </div>

            <div class="row g-2 mb-4" style="font-size:.88rem;">
              <div class="col-6">
                <div style="color:var(--text-muted);">Applied On</div>
                <div>{{ app.applied_on?.slice(0,10) }}</div>
              </div>
              <div class="col-6" v-if="app.interview_date">
                <div style="color:var(--text-muted);">Interview Date</div>
                <div style="color:var(--info);">{{ app.interview_date }} {{ app.interview_time }}</div>
              </div>
              <div class="col-12" v-if="app.interview_notes">
                <div style="color:var(--text-muted);">Interview Notes</div>
                <div>{{ app.interview_notes }}</div>
              </div>
            </div>

            <!-- Status timeline -->
            <div>
              <div style="color:var(--text-muted);font-size:.78rem;text-transform:uppercase;letter-spacing:.08em;margin-bottom:.75rem;">Application Timeline</div>
              <div class="d-flex gap-2 align-items-center">
                <div v-for="(step, i) in timeline" :key="step" class="d-flex align-items-center gap-2">
                  <div :style="{
                    width:'28px', height:'28px', borderRadius:'50%',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'.75rem', fontWeight:'700',
                    background: isReached(step) ? 'var(--accent)' : 'var(--bg-elevated)',
                    color: isReached(step) ? '#080e1a' : 'var(--text-muted)',
                    border: isReached(step) ? 'none' : '1px solid var(--border)'
                  }">{{ i+1 }}</div>
                  <span :style="{fontSize:'.8rem', color: isReached(step) ? 'var(--text-primary)' : 'var(--text-muted)'}">{{ step }}</span>
                  <div v-if="i<timeline.length-1" style="width:24px;height:1px;background:var(--border);"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  setup() {
    const route = VueRouter.useRoute();
    const app = Vue.ref(null);
    const loading = Vue.ref(true);
    const timeline = ['Applied', 'Shortlisted', 'Selected'];

    function isReached(step) {
      const order = { applied:1, shortlisted:2, selected:3, rejected:0 };
      const stepOrder = { Applied:1, Shortlisted:2, Selected:3 };
      if (app.value?.status === 'rejected') return step === 'Applied';
      return stepOrder[step] <= (order[app.value?.status] || 0);
    }

    async function load() {
      loading.value = true;
      try { app.value = await api.get(`/student/applications/${route.params.id}`); }
      catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    load();
    return { app, loading, timeline, isReached };
  },
};
