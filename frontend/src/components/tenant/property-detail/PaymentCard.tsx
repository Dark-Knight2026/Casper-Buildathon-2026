import { Calendar, CreditCard, DollarSign, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MockPayment } from '@/data/tenantLeases';
import { formatCurrency, formatDateLong, PAYMENT_STATUS_CONFIG } from './shared';

interface PaymentCardProps {
  payment: MockPayment;
  onReceipt: (id: string) => void;
}

export function PaymentCard({ payment, onReceipt }: PaymentCardProps) {
  const cfg = PAYMENT_STATUS_CONFIG[payment.status];
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
              {payment.method === 'credit_card'
                ? <CreditCard className="h-5 w-5" />
                : <DollarSign className="h-5 w-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <span className="font-semibold text-lg text-foreground">
                  {formatCurrency(payment.amount)}
                </span>
                <Badge className={`${cfg.color} flex items-center gap-1`}>
                  {cfg.icon}
                  {payment.status.toUpperCase()}
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4 shrink-0" />
                  <span>{formatDateLong(payment.paymentDate)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="h-4 w-4 shrink-0" />
                  <span className="capitalize">{payment.method.replace('_', ' ')}</span>
                </div>
                <p className="text-xs text-muted-foreground">Payment ID: {payment.id}</p>
              </div>
            </div>
          </div>
          {payment.status === 'completed' && (
            <Button variant="outline" size="sm" onClick={() => onReceipt(payment.id)}>
              <Download className="mr-2 h-4 w-4" />
              Receipt
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
