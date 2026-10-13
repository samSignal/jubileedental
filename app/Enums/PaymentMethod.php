<?php

namespace App\Enums;

enum PaymentMethod: string
{
    case Cash = 'cash';
    case Card = 'card';
    case MobileMoney = 'mobile_money';
    case BankTransfer = 'bank_transfer';

    public function label(): string
    {
        return match ($this) {
            self::Cash => 'Cash',
            self::Card => 'Card',
            self::MobileMoney => 'Mobile money',
            self::BankTransfer => 'Bank transfer',
        };
    }
}
