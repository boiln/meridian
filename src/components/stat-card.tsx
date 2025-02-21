interface StatCardProps {
    title: string;
    value: string;
    subtitle?: string;
    trend?: string;
    icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, trend, icon }: StatCardProps) {
    return (
        <div className="stats-card">
            <div className="stats-icon">{icon}</div>
            <div>
                <div className="flex items-baseline">
                    <span className="stats-value">{value}</span>
                    {subtitle && <span className="stats-unit">{subtitle}</span>}
                </div>
                <div className="stats-label">{title}</div>
                {trend && <div className="stats-detail">{trend}</div>}
            </div>
        </div>
    );
}
