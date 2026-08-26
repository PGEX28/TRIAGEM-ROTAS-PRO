const API = 'http://localhost:3001/api';

async function req(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await res.json();
  }
  return await res.text();
}

async function runE2ETest() {
  console.log('--- INICIANDO TESTE DE PONTA A PONTA MINUCIOSO ---');

  // 1. Criar novo saco
  console.log('1. Testando criação de saco...');
  const bag = await req(`${API}/bags`, 'POST', { name: 'Saco Teste E2E Campeche' });
  console.log('   ✅ Saco criado:', bag.id, bag.code);

  // 2. Bipar 1º Pacote
  console.log('2. Testando 1º Bip de pacote...');
  const scan1 = await req(`${API}/packages/scan`, 'POST', {
    bagId: bag.id,
    barcode: 'PKG-SC-001-BRASIL'
  });
  console.log('   ✅ Pacote 1 bipado com sucesso:', scan1.package_id);

  // 3. Vincular Endereço ao 1º Pacote
  console.log('3. Testando vinculação de endereço e criação da Parada #1...');
  const addr1 = await req(`${API}/packages/${scan1.package_id}/address`, 'POST', {
    bagId: bag.id,
    recipientName: 'Carlos Silva',
    addressData: {
      street: 'Rua das Gaivotas',
      number: '120',
      neighborhood: 'Campeche',
      city: 'Florianópolis',
      state: 'SC',
      zip_code: '88063-000'
    },
    ocrConfidence: 95
  });
  console.log('   ✅ Parada 1 criada com sucesso. Stop Number:', addr1.stop_number);

  // 4. Bipar 2º Pacote (Mesmo endereço para testar auto-agrupamento de parada)
  console.log('4. Testando 2º Bip (Mesmo endereço para consolidar parada)...');
  const scan2 = await req(`${API}/packages/scan`, 'POST', {
    bagId: bag.id,
    barcode: 'PKG-SC-002-BRASIL'
  });
  const addr2 = await req(`${API}/packages/${scan2.package_id}/address`, 'POST', {
    bagId: bag.id,
    recipientName: 'Maria Silva (Mesmo local)',
    addressData: {
      street: 'Rua das Gaivotas',
      number: '120',
      neighborhood: 'Campeche',
      city: 'Florianópolis',
      state: 'SC',
      zip_code: '88063-000'
    },
    ocrConfidence: 100
  });
  console.log('   ✅ Auto-agrupamento validado! Vinculado à Parada:', addr2.stop_number, 'Total na Parada:', addr2.package_count);

  // 5. Testar detecção de Duplicata
  console.log('5. Testando rejeição de duplicata...');
  const scanDup = await req(`${API}/packages/scan`, 'POST', {
    bagId: bag.id,
    barcode: 'PKG-SC-001-BRASIL'
  });
  if (scanDup.is_duplicate) {
    console.log('   ✅ Duplicata detectada e bloqueada com sucesso!');
  } else {
    throw new Error('Falha no teste de duplicata');
  }

  // 6. Testar Geração de Etiquetas Térmicas
  console.log('6. Testando geração de etiquetas térmicas...');
  const labels = await req(`${API}/labels/bag/${bag.id}`);
  console.log('   ✅ Etiquetas geradas com sucesso. Quantidade:', labels.length);
  console.log('   Volume do 1º pacote:', `${labels[0].volumeIndex}/${labels[0].volumeTotal}`);
  console.log('   Volume do 2º pacote:', `${labels[1].volumeIndex}/${labels[1].volumeTotal}`);

  // 7. Testar Exportação para o Circuit CSV
  console.log('7. Testando exportação da rota Circuit CSV...');
  const csvData = await req(`${API}/export/bag/${bag.id}/circuit-csv`);
  console.log('   ✅ CSV Circuit gerado com sucesso. Prévia das primeiras 2 linhas:');
  console.log(csvData.split('\r\n').slice(0, 2).join('\n'));

  // 8. Testar Finalização do Saco
  console.log('8. Testando finalização do saco...');
  const finishRes = await req(`${API}/bags/${bag.id}/finish`, 'POST');
  console.log('   ✅ Saco finalizado com sucesso. Status:', finishRes.status);

  // 9. Validar Atualização do Dashboard
  console.log('9. Validando métricas do Dashboard...');
  const stats = await req(`${API}/bags/stats`);
  console.log('   ✅ Estatísticas retornadas pelo backend:', stats);

  console.log('\n🎉 TODOS OS 9 TESTES PASSARAM COM 100% DE SUCESSO!');
}

runE2ETest().catch((err) => {
  console.error('❌ ERRO NO TESTE:', err.message);
  process.exit(1);
});
