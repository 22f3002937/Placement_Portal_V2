// ── Global reactive store ────────────────────────────────────────────────────
const store = Vue.reactive({
  user: null,         // { id, name, email, role }
  loading: false,
  toast: null,        // { msg, type }  type: 'success'|'error'|'info'
});

// ── API helper ───────────────────────────────────────────────────────────────
const api = {
  async request(method, path, body = null, isForm = false) {
    const opts = {
      method,
      headers: isForm ? {} : { 'Content-Type': 'application/json' },
      credentials: 'include',
    };
    if (body) opts.body = isForm ? body : JSON.stringify(body);
    const res = await fetch(`/api${path}`, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw { status: res.status, message: data.error || 'Request failed' };
    return data;
  },
  get:    (path)        => api.request('GET', path),
  post:   (path, body)  => api.request('POST', path, body),
  put:    (path, body)  => api.request('PUT', path, body),
  patch:  (path, body)  => api.request('PATCH', path, body),
  delete: (path)        => api.request('DELETE', path),
  upload: (path, form) => api.request('POST', path, form, true),
  putUpload: (path, form) => api.request('PUT',path, form, true),
};

// ── Toast helper ─────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  store.toast = { msg, type };
  setTimeout(() => store.toast = null, 3500);
}

// ── Root App component ────────────────────────────────────────────────────────
const App = {
  name: 'App',
  template: `
    <div>
      <navbar-component v-if="store.user" />
      <router-view />

      <!-- Toast -->
      <transition name="fade">
        <div v-if="store.toast"
          :class="['alert-ppa', 'alert-ppa-' + store.toast.type]"
          style="position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;min-width:260px;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.4);">
          <i :class="toastIcon" class="me-2"></i>{{ store.toast.msg }}
        </div>
      </transition>
    </div>
  `,
  setup() {
    const toastIcon = Vue.computed(() => {
      if (!store.toast) return '';
      return { success: 'bi bi-check-circle-fill', error: 'bi bi-exclamation-circle-fill', info: 'bi bi-info-circle-fill' }[store.toast.type];
    });
    return { store, toastIcon };
  },
};
