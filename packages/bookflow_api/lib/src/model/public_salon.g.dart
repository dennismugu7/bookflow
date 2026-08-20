// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'public_salon.dart';

// **************************************************************************
// BuiltValueGenerator
// **************************************************************************

class _$PublicSalon extends PublicSalon {
  @override
  final String handle;
  @override
  final String name;
  @override
  final String? tagline;
  @override
  final String? about;
  @override
  final String? category;
  @override
  final String? bannerUrl;
  @override
  final String? address;
  @override
  final String? mapsUrl;
  @override
  final BuiltList<PublicService> services;
  @override
  final BuiltList<PublicTeamMember> teamMembers;
  @override
  final BuiltList<PublicOpeningHours> openingHours;
  @override
  final BuiltList<String> portfolioImageUrls;

  factory _$PublicSalon([void Function(PublicSalonBuilder)? updates]) =>
      (PublicSalonBuilder()..update(updates))._build();

  _$PublicSalon._(
      {required this.handle,
      required this.name,
      this.tagline,
      this.about,
      this.category,
      this.bannerUrl,
      this.address,
      this.mapsUrl,
      required this.services,
      required this.teamMembers,
      required this.openingHours,
      required this.portfolioImageUrls})
      : super._();
  @override
  PublicSalon rebuild(void Function(PublicSalonBuilder) updates) =>
      (toBuilder()..update(updates)).build();

  @override
  PublicSalonBuilder toBuilder() => PublicSalonBuilder()..replace(this);

  @override
  bool operator ==(Object other) {
    if (identical(other, this)) return true;
    return other is PublicSalon &&
        handle == other.handle &&
        name == other.name &&
        tagline == other.tagline &&
        about == other.about &&
        category == other.category &&
        bannerUrl == other.bannerUrl &&
        address == other.address &&
        mapsUrl == other.mapsUrl &&
        services == other.services &&
        teamMembers == other.teamMembers &&
        openingHours == other.openingHours &&
        portfolioImageUrls == other.portfolioImageUrls;
  }

  @override
  int get hashCode {
    var _$hash = 0;
    _$hash = $jc(_$hash, handle.hashCode);
    _$hash = $jc(_$hash, name.hashCode);
    _$hash = $jc(_$hash, tagline.hashCode);
    _$hash = $jc(_$hash, about.hashCode);
    _$hash = $jc(_$hash, category.hashCode);
    _$hash = $jc(_$hash, bannerUrl.hashCode);
    _$hash = $jc(_$hash, address.hashCode);
    _$hash = $jc(_$hash, mapsUrl.hashCode);
    _$hash = $jc(_$hash, services.hashCode);
    _$hash = $jc(_$hash, teamMembers.hashCode);
    _$hash = $jc(_$hash, openingHours.hashCode);
    _$hash = $jc(_$hash, portfolioImageUrls.hashCode);
    _$hash = $jf(_$hash);
    return _$hash;
  }

  @override
  String toString() {
    return (newBuiltValueToStringHelper(r'PublicSalon')
          ..add('handle', handle)
          ..add('name', name)
          ..add('tagline', tagline)
          ..add('about', about)
          ..add('category', category)
          ..add('bannerUrl', bannerUrl)
          ..add('address', address)
          ..add('mapsUrl', mapsUrl)
          ..add('services', services)
          ..add('teamMembers', teamMembers)
          ..add('openingHours', openingHours)
          ..add('portfolioImageUrls', portfolioImageUrls))
        .toString();
  }
}

class PublicSalonBuilder implements Builder<PublicSalon, PublicSalonBuilder> {
  _$PublicSalon? _$v;

  String? _handle;
  String? get handle => _$this._handle;
  set handle(String? handle) => _$this._handle = handle;

  String? _name;
  String? get name => _$this._name;
  set name(String? name) => _$this._name = name;

  String? _tagline;
  String? get tagline => _$this._tagline;
  set tagline(String? tagline) => _$this._tagline = tagline;

  String? _about;
  String? get about => _$this._about;
  set about(String? about) => _$this._about = about;

  String? _category;
  String? get category => _$this._category;
  set category(String? category) => _$this._category = category;

  String? _bannerUrl;
  String? get bannerUrl => _$this._bannerUrl;
  set bannerUrl(String? bannerUrl) => _$this._bannerUrl = bannerUrl;

  String? _address;
  String? get address => _$this._address;
  set address(String? address) => _$this._address = address;

  String? _mapsUrl;
  String? get mapsUrl => _$this._mapsUrl;
  set mapsUrl(String? mapsUrl) => _$this._mapsUrl = mapsUrl;

  ListBuilder<PublicService>? _services;
  ListBuilder<PublicService> get services =>
      _$this._services ??= ListBuilder<PublicService>();
  set services(ListBuilder<PublicService>? services) =>
      _$this._services = services;

  ListBuilder<PublicTeamMember>? _teamMembers;
  ListBuilder<PublicTeamMember> get teamMembers =>
      _$this._teamMembers ??= ListBuilder<PublicTeamMember>();
  set teamMembers(ListBuilder<PublicTeamMember>? teamMembers) =>
      _$this._teamMembers = teamMembers;

  ListBuilder<PublicOpeningHours>? _openingHours;
  ListBuilder<PublicOpeningHours> get openingHours =>
      _$this._openingHours ??= ListBuilder<PublicOpeningHours>();
  set openingHours(ListBuilder<PublicOpeningHours>? openingHours) =>
      _$this._openingHours = openingHours;

  ListBuilder<String>? _portfolioImageUrls;
  ListBuilder<String> get portfolioImageUrls =>
      _$this._portfolioImageUrls ??= ListBuilder<String>();
  set portfolioImageUrls(ListBuilder<String>? portfolioImageUrls) =>
      _$this._portfolioImageUrls = portfolioImageUrls;

  PublicSalonBuilder() {
    PublicSalon._defaults(this);
  }

  PublicSalonBuilder get _$this {
    final $v = _$v;
    if ($v != null) {
      _handle = $v.handle;
      _name = $v.name;
      _tagline = $v.tagline;
      _about = $v.about;
      _category = $v.category;
      _bannerUrl = $v.bannerUrl;
      _address = $v.address;
      _mapsUrl = $v.mapsUrl;
      _services = $v.services.toBuilder();
      _teamMembers = $v.teamMembers.toBuilder();
      _openingHours = $v.openingHours.toBuilder();
      _portfolioImageUrls = $v.portfolioImageUrls.toBuilder();
      _$v = null;
    }
    return this;
  }

  @override
  void replace(PublicSalon other) {
    _$v = other as _$PublicSalon;
  }

  @override
  void update(void Function(PublicSalonBuilder)? updates) {
    if (updates != null) updates(this);
  }

  @override
  PublicSalon build() => _build();

  _$PublicSalon _build() {
    _$PublicSalon _$result;
    try {
      _$result = _$v ??
          _$PublicSalon._(
            handle: BuiltValueNullFieldError.checkNotNull(
                handle, r'PublicSalon', 'handle'),
            name: BuiltValueNullFieldError.checkNotNull(
                name, r'PublicSalon', 'name'),
            tagline: tagline,
            about: about,
            category: category,
            bannerUrl: bannerUrl,
            address: address,
            mapsUrl: mapsUrl,
            services: services.build(),
            teamMembers: teamMembers.build(),
            openingHours: openingHours.build(),
            portfolioImageUrls: portfolioImageUrls.build(),
          );
    } catch (_) {
      late String _$failedField;
      try {
        _$failedField = 'services';
        services.build();
        _$failedField = 'teamMembers';
        teamMembers.build();
        _$failedField = 'openingHours';
        openingHours.build();
        _$failedField = 'portfolioImageUrls';
        portfolioImageUrls.build();
      } catch (e) {
        throw BuiltValueNestedFieldError(
            r'PublicSalon', _$failedField, e.toString());
      }
      rethrow;
    }
    replace(_$result);
    return _$result;
  }
}

// ignore_for_file: deprecated_member_use_from_same_package,type=lint
