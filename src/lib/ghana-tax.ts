const SSNIT_PENSIONABLE_CAP = 3500

export function calculateSSNITEmployee(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.135
}

export function calculateGETTier2Employee(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.025
}

export function calculateNHIL(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.025
}

export function calculateCOVIDLevy(basicSalary: number): number {
  return basicSalary * 0.01
}

export function calculatePAYE(taxableIncome: number): number {
  let tax = 0
  let remaining = taxableIncome

  if (remaining > 20184) {
    tax += (remaining - 20184) * 0.30
    remaining = 20184
  }
  if (remaining > 3888) {
    tax += (remaining - 3888) * 0.25
    remaining = 3888
  }
  if (remaining > 726) {
    tax += (remaining - 726) * 0.175
    remaining = 726
  }
  if (remaining > 490) {
    tax += (remaining - 490) * 0.08
    remaining = 490
  }

  tax = Math.max(0, tax - 414.50)
  return Math.round(tax * 100) / 100
}

export function calculateSSNITEmployer(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.135
}

export function calculateSSNITTier2Employer(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.02
}

export function calculateGETTier2Employer(basicSalary: number): number {
  const capped = Math.min(basicSalary, SSNIT_PENSIONABLE_CAP)
  return capped * 0.025
}

export interface GhanaPayrollResult {
  basicSalary: number
  employee: {
    ssnitTier1: number
    getTier2: number
    nhil: number
    covidLevy: number
    paye: number
    totalDeductions: number
    netPay: number
  }
  employer: {
    ssnitTier1: number
    tier2: number
    getTier2: number
    totalEmployerCost: number
  }
}

export function calculateGhanaPayroll(basicSalary: number): GhanaPayrollResult {
  const ssnitEmployee = calculateSSNITEmployee(basicSalary)
  const getEmployee = calculateGETTier2Employee(basicSalary)
  const nhil = calculateNHIL(basicSalary)
  const covidLevy = calculateCOVIDLevy(basicSalary)

  const taxableIncome = basicSalary - ssnitEmployee - getEmployee - nhil
  const paye = calculatePAYE(taxableIncome)

  const totalEmployeeDeductions = ssnitEmployee + getEmployee + nhil + covidLevy + paye
  const netPay = basicSalary - totalEmployeeDeductions

  const employerSSNIT = calculateSSNITEmployer(basicSalary)
  const employerTier2 = calculateSSNITTier2Employer(basicSalary)
  const employerGET = calculateGETTier2Employer(basicSalary)
  const totalEmployerCost = basicSalary + employerSSNIT + employerTier2 + employerGET

  return {
    basicSalary,
    employee: {
      ssnitTier1: Math.round(ssnitEmployee * 100) / 100,
      getTier2: Math.round(getEmployee * 100) / 100,
      nhil: Math.round(nhil * 100) / 100,
      covidLevy: Math.round(covidLevy * 100) / 100,
      paye: Math.round(paye * 100) / 100,
      totalDeductions: Math.round(totalEmployeeDeductions * 100) / 100,
      netPay: Math.round(netPay * 100) / 100,
    },
    employer: {
      ssnitTier1: Math.round(employerSSNIT * 100) / 100,
      tier2: Math.round(employerTier2 * 100) / 100,
      getTier2: Math.round(employerGET * 100) / 100,
      totalEmployerCost: Math.round(totalEmployerCost * 100) / 100,
    },
  }
}
