'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { Loader2, CheckCircle, XCircle, ArrowLeft, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRICING_PLANS = [
  {
    id: 'basic',
    name: 'Базовый',
    price: 299,
    duration: 'месяц',
    features: ['Неограниченные лайки', 'Просмотр кто лайкнул', '5 суперлайков в день'],
  },
  {
    id: 'premium',
    name: 'Премиум',
    price: 799,
    duration: 'месяц',
    features: ['Все функции Базового', 'Приоритет в поиске', 'Без рекламы', 'Расширенные фильтры'],
  },
  {
    id: 'yearly',
    name: 'Годовой',
    price: 4999,
    duration: 'год',
    features: ['Все функции Премиум', 'Экономия 45%', 'Персональный менеджер', 'Эксклюзивные стикеры'],
  },
];

export function PaymentModal({ isOpen, onClose }: PaymentModalProps) {
  const { t } = useTranslation();
  const [selectedPlan, setSelectedPlan] = useState(PRICING_PLANS[0]);
  const [paymentStep, setPaymentStep] = useState<'select' | 'qr' | 'processing' | 'success' | 'error'>('select');
  const [qrData, setQrData] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const handleSelectPlan = async (plan: typeof PRICING_PLANS[0]) => {
    setSelectedPlan(plan);
    setPaymentStep('qr');

    try {
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: plan.price,
          description: `Love Compass ${plan.name} (${plan.duration})`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create payment');

      setQrData(data.qrCode);
      setPaymentId(data.paymentId);
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStep('error');
      toast.error(t('payment.createError'));
    }
  };

  const handleCheckPayment = async () => {
    if (!paymentId) return;

    setPaymentStep('processing');
    
    try {
      const res = await fetch(`/api/payment?paymentId=${paymentId}`);
      const data = await res.json();

      if (data.status === 'completed') {
        setPaymentStep('success');
        toast.success(t('payment.success'));
      } else {
        setPaymentStep('qr');
        toast.info(t('payment.pending'));
      }
    } catch (error) {
      console.error('Check payment error:', error);
      setPaymentStep('error');
    }
  };

  const handleClose = () => {
    setPaymentStep('select');
    setQrData(null);
    setPaymentId(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <Card className="border-rose-200 dark:border-rose-900/50 bg-card/95 backdrop-blur-xl shadow-2xl">
              <CardContent className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold gradient-text">
                    {t('payment.title')}
                  </h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleClose}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <XCircle className="w-5 h-5" />
                  </Button>
                </div>

                {/* Step 1: Select Plan */}
                {paymentStep === 'select' && (
                  <div className="space-y-4">
                    <p className="text-muted-foreground text-center mb-6">
                      {t('payment.selectPlan')}
                    </p>
                    <div className="grid gap-4">
                      {PRICING_PLANS.map((plan) => (
                        <motion.button
                          key={plan.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleSelectPlan(plan)}
                          className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                            selectedPlan?.id === plan.id
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20'
                              : 'border-border hover:border-rose-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-bold text-lg">{plan.name}</h3>
                              <p className="text-sm text-muted-foreground">{plan.duration}</p>
                              <ul className="mt-2 space-y-1">
                                {plan.features.map((feature, idx) => (
                                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-rose-600">{plan.price}₽</div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: QR Code */}
                {paymentStep === 'qr' && qrData && (
                  <div className="space-y-6">
                    <div className="text-center">
                      <Smartphone className="w-12 h-12 text-rose-500 mx-auto mb-2" />
                      <h3 className="text-lg font-bold">{t('payment.scanQR')}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('payment.scanQRDesc')}
                      </p>
                    </div>

                    <div className="flex justify-center p-6 bg-white rounded-xl">
                      <QRCodeSVG
                        value={qrData}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-2xl font-bold">
                        {selectedPlan?.price ?? 0}₽
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t('payment.expiresIn', { minutes: 15 })}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setPaymentStep('select')}
                      >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        {t('common.back')}
                      </Button>
                      <Button
                        className="flex-1 bg-gradient-to-r from-rose-500 to-pink-500"
                        onClick={handleCheckPayment}
                      >
                        {t('payment.checkPayment')}
                      </Button>
                    </div>

                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">
                        {t('payment.securePayment')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 3: Processing */}
                {paymentStep === 'processing' && (
                  <div className="text-center py-12 space-y-4">
                    <Loader2 className="w-16 h-16 text-rose-500 animate-spin mx-auto" />
                    <h3 className="text-xl font-bold">{t('payment.processing')}</h3>
                    <p className="text-muted-foreground">
                      {t('payment.checkingStatus')}
                    </p>
                  </div>
                )}

                {/* Step 4: Success */}
                {paymentStep === 'success' && (
                  <div className="text-center py-8 space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    >
                      <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
                    </motion.div>
                    <h3 className="text-2xl font-bold text-green-600">
                      {t('payment.success')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('payment.successDesc')}
                    </p>
                    <Button className="mt-4" onClick={handleClose}>
                      {t('common.close')}
                    </Button>
                  </div>
                )}

                {/* Step 5: Error */}
                {paymentStep === 'error' && (
                  <div className="text-center py-8 space-y-4">
                    <XCircle className="w-20 h-20 text-red-500 mx-auto" />
                    <h3 className="text-2xl font-bold text-red-600">
                      {t('payment.error')}
                    </h3>
                    <p className="text-muted-foreground">
                      {t('payment.errorDesc')}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <Button variant="outline" onClick={() => setPaymentStep('select')}>
                        {t('common.back')}
                      </Button>
                      <Button onClick={() => handleCheckPayment()}>
                        {t('payment.retry')}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
