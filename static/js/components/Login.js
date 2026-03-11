const LoginPage = {
  name: 'LoginPage',
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">PPA<span>.</span></div>
        <div class="auth-sub">Placement Portal Application</div>

        <div v-if="error" class="alert-ppa alert-ppa-error">
          <i class="bi bi-exclamation-circle-fill me-2"></i>{{ error }}
        </div>

        <div class="mb-3">
          <label class="ppa-label">Email address</label>
          <input v-model="form.email" type="email" class="ppa-input" placeholder="you@example.com"
            @keyup.enter="submit"/>
        </div>
        <div class="mb-4">
          <label class="ppa-label">Password</label>
          <div style="position:relative;">
            <input v-model="form.password" :type="showPwd ? 'text' : 'password'"
              class="ppa-input" placeholder="••••••••" @keyup.enter="submit"/>
            <button @click="showPwd=!showPwd"
              style="position:absolute;right:.75rem;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;">
              <i :class="showPwd ? 'bi bi-eye-slash' : 'bi bi-eye'"></i>
            </button>
          </div>
        </div>

        <button class="btn-ppa w-100 py-2" @click="submit" :disabled="loading">
          <span v-if="loading"><span class="ppa-spinner" style="width:1rem;height:1rem;border-width:2px;vertical-align:middle;"></span></span>
          <span v-else>Sign In</span>
        </button>

        <div class="mt-4 text-center" style="color:var(--text-muted);font-size:.88rem;">
          Don't have an account?
          <router-link to="/register" style="color:var(--accent);text-decoration:none;"> Register</router-link>
        </div>
      </div>
    </div>
  `,
  setup() {
    const router = VueRouter.useRouter();
    const form = Vue.reactive({ email: '', password: '' });
    const error = Vue.ref('');
    const loading = Vue.ref(false);
    const showPwd = Vue.ref(false);

    async function submit() {
      error.value = '';
      if (!form.email || !form.password) { error.value = 'Please fill in all fields.'; return; }
      loading.value = true;
      try {
        const data = await api.post('/auth/login', { email: form.email, password: form.password });
        store.user = data.user;
        showToast(`Welcome, ${data.user.name}!`);
        const dest = { admin: '/admin', company: '/company', student: '/student' }[data.user.role];
        router.push(dest || '/');
      } catch (e) {
        error.value = e.message || 'Login failed';
      } finally {
        loading.value = false;
      }
    }

    return { form, error, loading, showPwd, submit };
  },
};
