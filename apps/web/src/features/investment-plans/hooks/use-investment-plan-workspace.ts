import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import debounce from 'lodash/debounce'
import { useForm } from 'react-hook-form'
import {
  createDefaultInvestmentPlan,
  InvestmentPlanInputSchema,
  projectInvestmentPlan,
} from '@workspace/domain'

import {
  RevisionConflictError,
  useCreateInvestmentPlan,
  useInvestmentPlan,
  useInvestmentPlans,
  useReplaceInvestmentPlan,
} from '@/features/investment-plans/api/investment-plans'
import {
  getLastOpenedPlanId,
  setLastOpenedPlanId,
} from '@/features/investment-plans/lib/preferences'
import {
  applyRefreshProposalToPlan,
  normalizeInvestmentPlan,
} from '@/features/investment-plans/lib/refresh-proposal'

import type { Resolver } from 'react-hook-form'
import type { InvestmentPlanInput, InvestmentPlanProjectionBundle } from '@workspace/domain'
import type {
  InvestmentPlanRefreshResult,
  PersistedInvestmentPlan,
} from '@/features/investment-plans/api/investment-plans'

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'conflict' | 'error' | 'offline'

function computeLiveProjection(plan: InvestmentPlanInput): {
  projection: InvestmentPlanProjectionBundle | null
  plan: InvestmentPlanInput | null
} {
  const parsed = InvestmentPlanInputSchema.safeParse(normalizeInvestmentPlan(plan))
  if (!parsed.success) return { projection: null, plan: null }
  return {
    plan: parsed.data,
    // Skip 5×5 sensitivity on the interactive path — it is ~8× more work than scenarios alone.
    projection: projectInvestmentPlan(parsed.data, { includeSensitivity: false }),
  }
}

export function useInvestmentPlanWorkspace() {
  const listQuery = useInvestmentPlans()
  const createMutation = useCreateInvestmentPlan()
  const replaceMutation = useReplaceInvestmentPlan()

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(() => getLastOpenedPlanId())
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [revision, setRevision] = useState(1)
  const [projection, setProjection] = useState<InvestmentPlanProjectionBundle | null>(null)
  const [projectionPlan, setProjectionPlan] = useState<InvestmentPlanInput | null>(null)

  const revisionRef = useRef(revision)
  revisionRef.current = revision
  const saveStatusRef = useRef(saveStatus)
  saveStatusRef.current = saveStatus

  const summaries = listQuery.data ?? []

  useEffect(() => {
    if (!summaries.length) return
    if (selectedPlanId && summaries.some((plan) => plan.id === selectedPlanId)) return
    const nextId = summaries[0]!.id
    setSelectedPlanId(nextId)
    setLastOpenedPlanId(nextId)
  }, [summaries, selectedPlanId])

  const detailQuery = useInvestmentPlan(selectedPlanId)
  const remotePlan = detailQuery.data

  const form = useForm<InvestmentPlanInput>({
    resolver: zodResolver(InvestmentPlanInputSchema) as Resolver<InvestmentPlanInput>,
    // Avoid validating the full nested plan on every keystroke.
    mode: 'onBlur',
    defaultValues: createDefaultInvestmentPlan(),
  })

  const hydratedIdRef = useRef<string | null>(null)
  const skipHydrateRef = useRef(false)

  const publishProjection = useCallback((plan: InvestmentPlanInput) => {
    const result = computeLiveProjection(plan)
    setProjection(result.projection)
    setProjectionPlan(result.plan)
  }, [])

  const scheduleProjection = useMemo(
    () =>
      debounce((plan: InvestmentPlanInput) => {
        publishProjection(plan)
      }, 350),
    [publishProjection],
  )

  const savePlan = useMemo(
    () =>
      debounce(async (plan: InvestmentPlanInput) => {
        if (!navigator.onLine) {
          setSaveStatus('offline')
          return
        }
        const parsed = InvestmentPlanInputSchema.safeParse(normalizeInvestmentPlan(plan))
        if (!parsed.success) return
        setSaveStatus('saving')
        try {
          const saved = await replaceMutation.mutateAsync({
            id: parsed.data.id,
            revision: revisionRef.current,
            plan: parsed.data,
          })
          const { revision: nextRevision, updatedAt: _updatedAt, ...savedPlan } = saved
          setRevision(nextRevision)
          revisionRef.current = nextRevision
          // Clear dirty without clobbering in-progress keystrokes.
          form.reset(normalizeInvestmentPlan(savedPlan), { keepValues: true })
          setSaveStatus('saved')
        } catch (error) {
          if (error instanceof RevisionConflictError) {
            setSaveStatus('conflict')
            return
          }
          setSaveStatus('error')
        }
      }, 800),
    [form, replaceMutation],
  )

  useEffect(() => {
    if (!remotePlan) return
    if (skipHydrateRef.current) return
    if (hydratedIdRef.current === remotePlan.id && saveStatus === 'saving') return
    if (hydratedIdRef.current === remotePlan.id && form.formState.isDirty) return

    const { revision: nextRevision, updatedAt: _updatedAt, ...plan } = remotePlan
    const normalized = normalizeInvestmentPlan(plan)
    form.reset(normalized)
    setRevision(nextRevision)
    hydratedIdRef.current = remotePlan.id
    setSaveStatus('saved')
    scheduleProjection.cancel()
    publishProjection(normalized)
  }, [remotePlan, form, saveStatus, publishProjection, scheduleProjection])

  useEffect(() => {
    const subscription = form.watch((value) => {
      const plan = value as InvestmentPlanInput
      scheduleProjection(plan)
      if (!hydratedIdRef.current) return
      if (saveStatusRef.current === 'conflict') return
      if (!form.formState.isDirty) return
      savePlan(plan)
    })
    return () => {
      subscription.unsubscribe()
      scheduleProjection.cancel()
      savePlan.cancel()
    }
  }, [form, scheduleProjection, savePlan])

  const selectPlan = (id: string) => {
    savePlan.cancel()
    scheduleProjection.cancel()
    hydratedIdRef.current = null
    setSelectedPlanId(id)
    setLastOpenedPlanId(id)
    setSaveStatus('idle')
    setProjection(null)
    setProjectionPlan(null)
  }

  const createPlan = async () => {
    const plan = createDefaultInvestmentPlan()
    const saved = await createMutation.mutateAsync(plan)
    hydratedIdRef.current = null
    setSelectedPlanId(saved.id)
    setLastOpenedPlanId(saved.id)
    setRevision(saved.revision)
    form.reset(plan)
    hydratedIdRef.current = saved.id
    setSaveStatus('saved')
    publishProjection(plan)
    return saved
  }

  const reloadRemote = async () => {
    savePlan.cancel()
    scheduleProjection.cancel()
    hydratedIdRef.current = null
    const result = await detailQuery.refetch()
    if (result.data) {
      const { revision: nextRevision, updatedAt: _updatedAt, ...plan } = result.data
      const normalized = normalizeInvestmentPlan(plan)
      form.reset(normalized)
      setRevision(nextRevision)
      hydratedIdRef.current = result.data.id
      setSaveStatus('saved')
      publishProjection(normalized)
    }
  }

  const applyRefreshProposal = (result: InvestmentPlanRefreshResult) => {
    const current = normalizeInvestmentPlan(form.getValues())
    const next = applyRefreshProposalToPlan(current, result)
    skipHydrateRef.current = true
    form.reset(next)
    publishProjection(next)
    setSaveStatus('saving')
    void (async () => {
      try {
        const parsed = InvestmentPlanInputSchema.safeParse(normalizeInvestmentPlan(next))
        if (!parsed.success) {
          setSaveStatus('error')
          return
        }
        const saved = await replaceMutation.mutateAsync({
          id: parsed.data.id,
          revision: revisionRef.current,
          plan: parsed.data,
        })
        const { revision: nextRevision, updatedAt: _updatedAt, ...plan } = saved
        setRevision(nextRevision)
        revisionRef.current = nextRevision
        form.reset(normalizeInvestmentPlan(plan))
        hydratedIdRef.current = saved.id
        publishProjection(plan)
        setSaveStatus('saved')
      } catch (error) {
        if (error instanceof RevisionConflictError) {
          setSaveStatus('conflict')
          return
        }
        setSaveStatus('error')
      } finally {
        skipHydrateRef.current = false
      }
    })()
  }

  return {
    listQuery,
    detailQuery,
    form,
    projection,
    projectionPlan,
    selectedPlanId,
    revision,
    saveStatus,
    summaries,
    selectPlan,
    createPlan,
    reloadRemote,
    applyRefreshProposal,
    isCreating: createMutation.isPending,
    remotePlan: remotePlan as PersistedInvestmentPlan | undefined,
  }
}
