const StudentProfile = {
  name: 'StudentProfile',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Student</div>
        <router-link to="/student" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/student/history" class="sidebar-link" active-class="active"><i class="bi bi-trophy"></i> Placement History</router-link>
        <router-link to="/student/profile" class="sidebar-link" active-class="active"><i class="bi bi-person-gear"></i> Profile</router-link>
      </aside>
      <main class="ppa-main">
        <div class="page-header"><h1 class="page-title">Edit Profile</h1></div>
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else style="max-width:520px;">
          <div class="ppa-card">
            <div class="row g-3">
              <div class="col-12">
                <label class="ppa-label">Full Name</label>
                <input v-model="form.name" class="ppa-input"/>
              </div>
              <div class="col-12">
                <label class="ppa-label">Email</label>
                <input :value="profile.email" class="ppa-input" disabled style="opacity:.5;cursor:not-allowed;"/>
              </div>
              <div class="col-md-6">
                <label class="ppa-label">Branch</label>
                <input v-model="form.branch" class="ppa-input"/>
              </div>
              <div class="col-md-6">
                <label class="ppa-label">CGPA</label>
                <input v-model.number="form.cgpa" type="number" step="0.01" min="0" max="10" class="ppa-input"/>
              </div>
              <div class="col-12">
                <label class="ppa-label">Graduation Year</label>
                <input v-model.number="form.graduation_year" type="number" class="ppa-input"/>
              </div>
              <div class="col-12">
                <label class="ppa-label">Resume (PDF/DOC)</label>
                <input type="file" @change="onFile" accept=".pdf,.doc,.docx"
                  style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:8px;padding:.6rem 1rem;width:100%;color:var(--text-primary);cursor:pointer;"/>
                <div v-if="profile.resume" style="color:var(--text-muted);font-size:.8rem;margin-top:.35rem;">
                  <i class="bi bi-paperclip me-1"></i>Current: {{ profile.resume }}
                </div>
              </div>
            </div>
            <button class="btn-ppa mt-4" @click="save" :disabled="saving">
              <span v-if="saving"><span class="ppa-spinner" style="width:.9rem;height:.9rem;border-width:2px;vertical-align:middle;"></span></span>
              <span v-else><i class="bi bi-check-lg me-1"></i>Save Changes</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  `,
  setup() {
    const profile = Vue.ref({});
    const form = Vue.reactive({ name:'', branch:'', cgpa:null, graduation_year:null });
    const resumeFile = Vue.ref(null);
    const loading = Vue.ref(true);
    const saving = Vue.ref(false);

    function onFile(e) { resumeFile.value = e.target.files[0] || null; }

    async function load() {
      loading.value = true;
      try {
        profile.value = await api.get('/student/profile');
        Object.assign(form, { name: profile.value.name, branch: profile.value.branch, cgpa: profile.value.cgpa, graduation_year: profile.value.graduation_year });
      } catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function save() {
      saving.value = true;
      try {
        if (resumeFile.value) {
          const fd = new FormData();
          Object.entries(form).forEach(([k,v]) => fd.append(k, v));
          fd.append('resume', resumeFile.value);
          await api.putUpload('/student/profile', fd);
        } else {
          await api.put('/student/profile', { ...form });
        }
        showToast('Profile updated');
        store.user = { ...store.user, name: form.name };
        await load();
      } catch (e) { showToast(e.message, 'error'); }
      finally { saving.value = false; }
    }

    load();
    return { profile, form, loading, saving, onFile, save };
  },
};
