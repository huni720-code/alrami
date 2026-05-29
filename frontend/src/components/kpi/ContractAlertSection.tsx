import type { KpiContract } from '../../types/kpi'
import ContractAlertMessageCard from '../alerts/ContractAlertMessageCard'

interface Props {
  contracts: KpiContract[]
  estimatedSaving: number
  onSettingsClick: () => void
}

export default function ContractAlertSection({ contracts, estimatedSaving, onSettingsClick }: Props) {
  if (contracts.length === 0) return null

  return (
    <div className="mb-4 space-y-2">
      {contracts.map((c, i) => (
        <ContractAlertMessageCard
          key={i}
          contract={c}
          estimatedSaving={estimatedSaving}
          onSettingsClick={onSettingsClick}
        />
      ))}
    </div>
  )
}
