<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:fn="http://www.w3.org/2005/xpath-functions" xmlns:cfdi="http://www.sat.gob.mx/cfd/4" version="2.0">
  
  <!-- Manejador de datos requeridos -->
  <xsl:template name="Requerido">
    <xsl:param name="valor"/>
    <xsl:if test="$valor">
      <xsl:value-of select="$valor"/>|
    </xsl:if>
    <xsl:if test="not($valor)">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Manejador de datos opcionales -->
  <xsl:template name="Opcional">
    <xsl:param name="valor"/>
    <xsl:if test="$valor">
      <xsl:value-of select="$valor"/>|
    </xsl:if>
    <xsl:if test="not($valor)">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Normalizador de espacios en blanco -->
  <xsl:template name="Eliminar">
    <xsl:param name="TextoOriginal"/>
    <xsl:if test="$TextoOriginal">
      <xsl:value-of select="normalize-space($TextoOriginal)"/>
    </xsl:if>
    <xsl:if test="not($TextoOriginal)">
      <xsl:value-of select="''"/>
    </xsl:if>
  </xsl:template>

  <!-- Manejador de datos de tipo fecha -->
  <xsl:template name="Fecha">
    <xsl:param name="valor"/>
    <xsl:if test="$valor">
      <xsl:value-of select="$valor"/>|
    </xsl:if>
    <xsl:if test="not($valor)">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Manejador de datos de tipo decimal -->
  <xsl:template name="Decimal">
    <xsl:param name="valor"/>
    <xsl:if test="string(number($valor)) != 'NaN'">
      <xsl:value-of select="$valor"/>|
    </xsl:if>
    <xsl:if test="string(number($valor)) = 'NaN'">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Truncador de decimales -->
  <xsl:template name="TruncaDecimales">
    <xsl:param name="valor"/>
    <xsl:param name="decimales"/>
    <xsl:if test="string(number($valor)) != 'NaN'">
      <xsl:value-of select="format-number($valor, concat('#0.', substring('000000', 1, $decimales)))"/>|
    </xsl:if>
    <xsl:if test="string(number($valor)) = 'NaN'">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Manejador de datos de tipo moneda -->
  <xsl:template name="Moneda">
    <xsl:param name="valor"/>
    <xsl:if test="$valor">
      <xsl:value-of select="format-number($valor,'#0.00')"/>|
    </xsl:if>
    <xsl:if test="not($valor)">
      <xsl:value-of select="'0.00'"/>|
    </xsl:if>
  </xsl:template>

  <!-- Manejador de subnodos opcionales -->
  <xsl:template name="SubNodosOpcionales">
    <xsl:param name="nodo"/>
    <xsl:param name="valor"/>
    <xsl:if test="$nodo">
      <xsl:value-of select="$valor"/>|
    </xsl:if>
    <xsl:if test="not($nodo)">
      <xsl:value-of select="''"/>|
    </xsl:if>
  </xsl:template>

  <!-- Validador de valores requeridos -->
  <xsl:template name="ValidaRequerido">
    <xsl:param name="valor"/>
    <xsl:param name="mensaje"/>
    <xsl:if test="not($valor)">
      <xsl:message terminate="yes">
        <xsl:value-of select="$mensaje"/>
      </xsl:message>
    </xsl:if>
  </xsl:template>

  <!-- Formateador de RFC -->
  <xsl:template name="FormatearRFC">
    <xsl:param name="rfc"/>
    <xsl:value-of select="translate($rfc, ' /-().', '')"/>|
  </xsl:template>
</xsl:stylesheet>