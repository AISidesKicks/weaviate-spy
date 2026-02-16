
# Ollama test script - verifies models are working correctly
# Run from dummy directory: ./ollama_test.sh

echo -e "\n\n granite4:tiny-h 'Mluvíš česky?'"
docker compose exec ollama ollama run granite4:tiny-h "Mluvíš česky?"

echo -e "\n\n granite-embedding:278m 'Mluvíš česky?'"
docker compose exec ollama ollama run granite-embedding:278m "Mluvíš česky?"

echo -e "\n\n Jsou modely v GPU ?"
docker compose exec ollama ollama ps

echo -e "\n\n curl granite4:tiny-h generation test 'Napiš básničku na téma: Moře i obloha jsou modré přemodré!'"
curl -N -X POST http://localhost:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
        "model": "granite4:tiny-h",
        "messages": [{"role": "user", "content": "Napiš básničku na téma: Moře i obloha jsou modré přemodré!"}],
        "stream": false
     }'

echo -e "\n\n curl granite4:tiny-h generation test 'Jaká je nejznámější česká kultovní tragikomedie?'"
curl -N -X POST http://localhost:11434/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
        "model": "granite4:tiny-h",
        "messages": [{"role": "user", "content": "Jaká je nejznámější česká kultovní tragikomedie?"}],
        "stream": false
     }'

echo -e "\n\n======================================"
echo -e "EMBEDDING TEST WITH DIMENSION COUNTING"
echo -e "======================================"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "\n\nERROR: 'jq' is not installed!"
    echo "jq is required for parsing JSON and counting embedding dimensions."
    echo ""
    echo "To install jq:"
    echo "  Ubuntu/Debian: sudo apt-get install jq"
    echo "  CentOS/RHEL:   sudo yum install jq"
    echo "  macOS:         brew install jq"
    echo ""
    echo "Skipping embedding test..."
    echo -e "======================================\n"
else
    echo -e "\n\n curl granite-embedding:278m embedding test 'Kultovní tragikomedie o dospívání a střetu generací'"
    RESPONSE=$(curl -s -X POST http://localhost:11434/api/embed \
         -H "Content-Type: application/json" \
         -d '{
            "model": "granite-embedding:278m",
            "input": "Kultovní tragikomedie o dospívání a střetu generací"
         }')

    echo "Response (first 10 values):"
    echo $RESPONSE | jq '{model: .model, embedding: .embeddings[0][:10]}'

    DIMENSION=$(echo $RESPONSE | jq -r '.embeddings[0]' | jq 'length')
    echo ""
    echo "Embedding dimension: $DIMENSION"
    echo "Expected dimension: 768"
    echo -e "======================================\n"
fi

