# Dummy data script for Weaviate - creates Filmy collection with sample movies
# Run with: python dummy/weaviate_dummy.py
# Type YES to confirm deletion and recreation of the Filmy collection

import weaviate
import json
import sys

from weaviate.classes.config import Configure, Property, DataType
from weaviate.classes.generate import GenerativeConfig
from weaviate.classes.query import Filter, HybridFusion, MetadataQuery

# Ask for confirmation before deleting Filmy collection
confirm = input("Are you sure you want to delete and recreate 'Filmy' collection? Type YES to confirm: ")
if confirm != "YES":
    print("Aborted.")
    sys.exit(0)

with weaviate.connect_to_local() as client:

    try:
        client.collections.delete(name="Filmy")
        print("Deleted existing 'Filmy' collection")
    except Exception:
        pass

    movies = client.collections.create(
        name="Filmy",
        description="Sbírka filmů s českými tituly a popisy pro testování vyhledávání a RAG",
        properties=[
            Property(name="title", data_type=DataType.TEXT, description="Název filmu"),
            Property(name="description", data_type=DataType.TEXT, description="Popis filmu"),
            Property(name="genre", data_type=DataType.TEXT, description="Žánr filmu"),
            Property(name="year", data_type=DataType.INT, description="Rok vydání"),
            Property(name="origin", data_type=DataType.TEXT, description="Země původu"),
        ],
        vector_config=Configure.Vectors.text2vec_ollama(
            api_endpoint="http://ollama:11434",
            model="granite-embedding:278m",
        ),
    )

    data_objects = [

        {"title": "Počátek", "description": "Zkušený zloděj, který krade tajemství z hloubi podvědomí během spánku, musí tentokrát myšlenku do mysli vložit, nikoliv ji ukrást.", "genre": "Sci-Fi", "year": 2010, "origin": "USA"},
        {"title": "Interstellar", "description": "Skupina průzkumníků cestuje červí dírou ve vesmíru, aby zajistila přežití lidstva na planetě Zemi, která pomalu umírá.", "genre": "Sci-Fi", "year": 2014, "origin": "USA"},
        {"title": "Blade Runner 2049", "description": "Mladý policista odhaluje dlouho pohřbené tajemství, které by mohlo uvrhnout zbytek společnosti do chaosu, a hledá zmizelého legendárního detektiva.", "genre": "Sci-Fi", "year": 2017, "origin": "USA"},

        {"title": "Vykoupení z věznice Shawshank", "description": "Bankéř neprávem odsouzený za vraždu své ženy nachází ve vězení naději a nečekané přátelství, které mu pomůže přežít dvě desetiletí za mřížemi.", "genre": "Drama", "year": 1994, "origin": "USA"},
        {"title": "Forrest Gump", "description": "Příběh muže s nízkým IQ, který se díky své laskavosti a štěstí nevědomky stane součástí klíčových historických událostí 20. století.", "genre": "Drama", "year": 1994, "origin": "USA"},
        {"title": "Zelená míle", "description": "Dozorce ve věznici pro odsouzence na smrt zjistí, že jeden z vězňů disponuje zázračným darem léčit nemocné a trpící.", "genre": "Drama", "year": 1999, "origin": "USA"},

        {"title": "Pelíšky", "description": "Kultovní tragikomedie o dospívání a střetu generací ve dvou sousedských rodinách v Praze na sklonku 60. let.", "genre": "Komedie", "year": 1999, "origin": "Česká republika"},
        {"title": "Grandhotel Budapešť", "description": "Dobrodružství svérázného správce věhlasného hotelu a jeho mladého pomocníka při pátrání po ukradeném renesančním obrazu.", "genre": "Komedie", "year": 2014, "origin": "USA/Velká Británie/Německo"},
        {"title": "Nedotknutelní", "description": "Ochrnutý aristokrat si najme jako ošetřovatele živelného mladíka z předměstí, čímž vznikne přátelství, které oběma změní pohled na svět.", "genre": "Komedie", "year": 2011, "origin": "Francie"},

        {"title": "Mlčení jehňátek", "description": "Mladá agentka FBI musí požádat o pomoc uvězněného geniálního psychiatra a kanibala, aby dopadla jiného nebezpečného sériového vraha.", "genre": "Thriller", "year": 1991, "origin": "USA"},
        {"title": "Parazit", "description": "Chudá rodina se lstí infiltruje do domácnosti bohatých, což spustí řetězec nečekaných událostí, které vyústí v krvavý konflikt.", "genre": "Thriller", "year": 2019, "origin": "Jižní Korea"},
        {"title": "Joker", "description": "Zkrachovalý komik se v osamění a nepochopení propadá do šílenství, čímž se zrodí jeden z nejděsivějších kriminálníků ve městě Gotham.", "genre": "Thriller", "year": 2019, "origin": "USA"}

    ]

    movies = client.collections.use("Filmy")

    with movies.batch.fixed_size(batch_size=200) as batch:
        for obj in data_objects:
            batch.add_object(properties=obj)

    print(f"Imported & vectorized {len(movies)} objects into the Filmy collection")


    print("\n=== HYBRID SEARCH WITH GENRE FILTER ===")
    print("Query: 'kultovní tragikomedie' filtered by genre='Komedie'\n")

    response = movies.query.hybrid(
        query="kultovní tragikomedie",
        limit=3,
        alpha=0.5,
        fusion_type=HybridFusion.RELATIVE_SCORE,
        filters=Filter.by_property("genre").equal("Komedie"),
        return_metadata=MetadataQuery(score=True)
    )

    for obj in response.objects:
        print(f"Title: {obj.properties['title']}")
        print(f"Year: {obj.properties['year']}")
        print(f"Origin: {obj.properties['origin']}")
        print(f"Genre: {obj.properties['genre']}")
        print(f"Score: {obj.metadata.score}")
        print("---")

    print("\n=== HYBRID SEARCH (ALL GENRES) ===")
    print("Query: 'kultovní tragikomedie' - showing all genres for comparison\n")

    response_all = movies.query.hybrid(
        query="kultovní tragikomedie",
        limit=5,
        alpha=0.3,
        fusion_type=HybridFusion.RELATIVE_SCORE,
        return_metadata=MetadataQuery(score=True)
    )

    for obj in response_all.objects:
        print(f"Title: {obj.properties['title']}")
        print(f"Year: {obj.properties['year']}")
        print(f"Origin: {obj.properties['origin']}")
        print(f"Genre: {obj.properties['genre']}")
        print(f"Score: {obj.metadata.score}")
        print("---")

    print("\n=== RAG SEARCH WITH GENERATION (kultovní tragikomedie 3) ===")
    print("Query: 'kultovní tragikomedie'\n")

    response = movies.generate.near_text(
        query="kultovní tragikomedie",
        limit=3,
        grouped_task="Využij jen data z kontextu, zahrn vždy citace názvů filmů v uvozovkách s rokem vydání ve závorkách. piš pouze a jen česky! Napiš sumář o čem je tato kategorie filmů.",
        generative_provider=GenerativeConfig.ollama(
            api_endpoint="http://ollama:11434",
            model="granite4:tiny-h",
        ),
    )

    print(response.generative.text) 

    print("\n=== HYBRID SEARCH WITH GENERATION + Filter Komedie (kultovní tragikomedie 3) ===")
    print("Query: 'kultovní tragikomedie'\n")

    response = movies.generate.hybrid(
        query="kultovní tragikomedie",
        limit=3,
        alpha=0.5,
        filters=Filter.by_property("genre").equal("Komedie"),
        grouped_task="Využij jen data z kontextu, zahrn vždy citace názvů filmů v uvozovkách s rokem vydání ve závorkách. Piš pouze a je nčesky! Napiš sumář o čem je tato kategorie filmů.",
        generative_provider=GenerativeConfig.ollama( 
            api_endpoint="http://ollama:11434",
            model="granite4:tiny-h",
        ),
    )

    print(response.generative.text) 

    print("\n=== RAG SEARCH WITH GENERATION (kultovní tragikomedie 1) ===")
    print("Query: 'kultovní tragikomedie'\n")

    response = movies.generate.near_text(
        query="kultovní tragikomedie",
        limit=3,
        grouped_task="Využij jen data z kontextu, zahrn vždy citace názvů filmů v uvozovkách s rokem vydání ve závorkách. piš pouze a jen česky! Jaká je nejznámější česká kultovní tragikomedie?",
        generative_provider=GenerativeConfig.ollama(
            api_endpoint="http://ollama:11434",
            model="granite4:tiny-h",
        ),
    )

    print(response.generative.text) 

    print("\n=== HYBRID SEARCH WITH GENERATION + Filter Komedie (kultovní tragikomedie 1) ===")
    print("Query: 'kultovní tragikomedie'\n")

    response = movies.generate.hybrid(
        query="kultovní tragikomedie",
        limit=3,
        alpha=0.5,
        filters=Filter.by_property("genre").equal("Komedie"),
        grouped_task="Využij jen data z kontextu, zahrn vždy citace názvů filmů v uvozovkách s rokem vydání ve závorkách. Piš pouze a je česky! Jaká je nejznámější česká kultovní tragikomedie?",
        generative_provider=GenerativeConfig.ollama( 
            api_endpoint="http://ollama:11434",
            model="granite4:tiny-h",
        ),
    )

    print(response.generative.text) 


    print("\n=== HYBRID SEARCH WITH GENERATION + Filter Komedie (nový americký film 1) ===")
    print("Query: 'nejnovější americký film'\n")

    response = movies.generate.hybrid(
        query="nový americký film",
        limit=12,
        alpha=0.5, 
        grouped_task="Využij jen data z kontextu, zahrn vždy citace názvů filmů v uvozovkách s rokem vydání ve závorkách. Piš pouze a je česky! Jaký je nejnovější americký film?",
        generative_provider=GenerativeConfig.ollama( 
            api_endpoint="http://ollama:11434",
            model="granite4:tiny-h",
        ),
    )

    print(response.generative.text) 
