const CompanyProfile = {
  name: 'CompanyProfile',
  template: `
    <div class="ppa-layout">
      <aside class="ppa-sidebar">
        <div class="sidebar-section">Company</div>
        <router-link to="/company" class="sidebar-link" active-class="active" exact><i class="bi bi-grid-1x2"></i> Dashboard</router-link>
        <router-link to="/company/profile" class="sidebar-link" active-class="active"><i class="bi bi-building-gear"></i> Profile</router-link>
      </aside>
      <main class="ppa-main">
        <div class="page-header"><h1 class="page-title">Company Profile</h1></div>
        <div v-if="loading" class="text-center py-5"><span class="ppa-spinner" style="width:2rem;height:2rem;"></span></div>
        <div v-else style="max-width:540px;">
          <div class="ppa-card mb-4">
            <div class="d-flex align-items-center gap-3 mb-4">
              <div style="width:56px;height:56px;background:var(--accent-glow);border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;color:var(--accent);">
                <i class="bi bi-building"></i>
              </div>
              <div>
                <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:1.1rem;">{{ form.name }}</div>
                <div style="color:var(--text-muted);font-size:.85rem;">{{ profile.email }}</div>
              </div>
              <span class="badge-ppa ms-auto" :class="'badge-'+profile.approval_status">{{ profile.approval_status }}</span>
            </div>
            <div class="row g-3">
              <div class="col-12">
                <label class="ppa-label">Company Name</label>
                <input v-model="form.name" class="ppa-input"/>
              </div>
              <div class="col-12">
                <label class="ppa-label">HR Contact</label>
                <input v-model="form.hr_contact" class="ppa-input"/>
              </div>
              <div class="col-12">
                <label class="ppa-label">Website</label>
                <input v-model="form.website" class="ppa-input"/>
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
    const form = Vue.reactive({ name:'', hr_contact:'', website:'' });
    const loading = Vue.ref(true);
    const saving = Vue.ref(false);

    async function load() {
      loading.value = true;
      try {
        profile.value = await api.get('/company/profile');
        form.name = profile.value.name;
        form.hr_contact = profile.value.hr_contact;
        form.website = profile.value.website;
      } catch (e) { showToast(e.message, 'error'); }
      finally { loading.value = false; }
    }

    async function save() {
      saving.value = true;
      try {
        await api.put('/company/profile', { ...form });
        showToast('Profile updated');
        await load();
      } catch (e) { showToast(e.message, 'error'); }
      finally { saving.value = false; }
    }

    load();
    return { profile, form, loading, saving, save };
  },
};
