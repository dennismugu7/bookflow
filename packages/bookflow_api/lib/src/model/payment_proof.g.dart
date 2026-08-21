// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'payment_proof.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PaymentProof extends PaymentProof {
  @override
  final String url;

  factory _$PaymentProof([void Function(PaymentProofBuilder)? updates]) =>
      (PaymentProofBuilder()..update(updates))._build();

  _$PaymentProof._({required this.url}) : super._();
  @override
  PaymentProof rebuild(void Function(PaymentProofBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PaymentProofBuilder toBuilder() => PaymentProofBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PaymentProof && url == other.url;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, url.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PaymentProof')..add('url', url))
        .toString();
  }
}

class PaymentProofBuilder
    implements Builder<PaymentProof, PaymentProofBuilder> {
  _$PaymentProof? _$v;

  String? _url;
  String? get url => _$this._url;
  set url(String? url) => _$this._url = url;

  PaymentProofBuilder() {
    PaymentProof._defaults(this);
  }

  PaymentProofBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _url = $v.url;
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PaymentProof other) {
    _$v = other as _$PaymentProof;
  }

  @override
  void update(void Function(PaymentProofBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PaymentProof build() => _build();

  _$PaymentProof _build() {
    final _$result = _$v ??
        _$PaymentProof._(
          url: BuiltValueNullFieldError.checkNotNull(
              url, r'PaymentProof', 'url'),
        );
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
