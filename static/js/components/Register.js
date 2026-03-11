const RegisterPage = {
  name: 'RegisterPage',
  template: `
    <div class="auth-wrap" style="align-items:flex-start;padding-top:2rem;">
      <div class="auth-card" style="max-width:520px;">
        <div class="auth-logo">PPA<span>.</span></div>
        <div class="auth-sub">Create your account</div>

        <!-- Tabs -->
        <div class="ppa-tabs mb-4">
          <div class="ppa-tab" :class="{active:tab==='student'}" @click="tab='student'">
            <i class="bi bi-mortarboard me-1"></i>Student
          </div>
          <div class="ppa-tab" :class="{active:tab==='company'}" @click="tab='company'">
            <i class="bi bi-building me-1"></i>Company
          </div>
        </div>

        <div v-if="error" class="alert-ppa alert-ppa-error">
          <i class="bi bi-exclamation-circle-fill me-2"></i>{{ error }}
        </div>
        <div v-if="success" class="alert-ppa alert-ppa-success">
          <i class="bi bi-check-circle-fill me-2"></i>{{ success }}
        </div>

        <!-- Student Form -->
        <div v-if="tab==='student'">
          <div class="row g-3">
            <div class="col-12">
              <label class="ppa-label">Full Name</label>
              <input v-model="student.name" class="ppa-input" placeholder="John Doe"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Email</label>
              <input v-model="student.email" type="email" class="ppa-input" placeholder="you@college.edu"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Password</label>
              <input v-model="student.password" type="password" class="ppa-input" placeholder="Min 6 characters"/>
            </div>
            <div class="col-md-6">
              <label class="ppa-label">Branch</label>
              <input v-model="student.branch" class="ppa-input" placeholder="e.g. CS"/>
            </div>
            <div class="col-md-6">
              <label class="ppa-label">CGPA</label>
              <input v-model.number="student.cgpa" type="number" step="0.01" min="0" max="10" class="ppa-input" placeholder="8.5"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Graduation Year</label>
              <input v-model.number="student.graduation_year" type="number" class="ppa-input" placeholder="2025"/>
            </div>
          </div>
          <button class="btn-ppa w-100 py-2 mt-4" @click="registerStudent" :disabled="loading">
            <span v-if="loading"><span class="ppa-spinner" style="width:1rem;height:1rem;border-width:2px;vertical-align:middle;"></span></span>
            <span v-else>Register as Student</span>
          </button>
        </div>

        <!-- Company Form -->
        <div v-if="tab==='company'">
          <div class="row g-3">
            <div class="col-12">
              <label class="ppa-label">Company Name</label>
              <input v-model="company.name" class="ppa-input" placeholder="Acme Corp"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Company Email</label>
              <input v-model="company.email" type="email" class="ppa-input" placeholder="hr@company.com"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Password</label>
              <input v-model="company.password" type="password" class="ppa-input" placeholder="Min 6 characters"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">HR Contact Name</label>
              <input v-model="company.hr_contact" class="ppa-input" placeholder="Jane Smith"/>
            </div>
            <div class="col-12">
              <label class="ppa-label">Website</label>
              <input v-model="company.website" class="ppa-input" placeholder="https://company.com"/>
            </div>
          </div>
          <p style="color:var(--text-muted);font-size:.8rem;margin-top:.75rem;">
            <i class="bi bi-info-circle me-1"></i>Company registration requires admin approval before login.
          </p>
          <button class="btn-ppa w-100 py-2 mt-3" @click="registerCompany" :disabled="loading">
            <span v-if="loading"><span class="ppa-spinner" style="width:1rem;height:1rem;border-width:2px;vertical-align:middle;"></span></span>
            <span v-else>Submit for Approval</span>
          </button>
        </div>

        <div class="mt-4 text-center" style="color:var(--text-muted);font-size:.88rem;">
          Already have an account?
          <router-link to="/login" style="color:var(--accent);text-decoration:none;font-weight:500;"> Sign in</router-link>
        </div>
      </div>
    </div>
  `,
  setup() {
    const router = VueRouter.useRouter();
    const tab = Vue.ref('student');
    const error = Vue.ref('');
    const success = Vue.ref('');
    const loading = Vue.ref(false);

    const student = Vue.reactive({ name:'', email:'', password:'', branch:'', cgpa:null, graduation_year:null });
    const company = Vue.reactive({ name:'', email:'', password:'', hr_contact:'', website:'' });

    async function registerStudent() {
      error.value = ''; success.value = '';
      loading.value = true;
      try {
        await api.post('/auth/register/student', { ...student });
        success.value = 'Registered! Please sign in.';
        setTimeout(() => router.push('/login'), 1500);
      } catch (e) { error.value = e.message; }
      finally { loading.value = false; }
    }

    async function registerCompany() {
      error.value = ''; success.value = '';
      loading.value = true;
      try {
        await api.post('/auth/register/company', { ...company });
        success.value = 'Registration submitted. Await admin approval.';
      } catch (e) { error.value = e.message; }
      finally { loading.value = false; }
    }

    return { tab, error, success, loading, student, company, registerStudent, registerCompany };
  },
};
